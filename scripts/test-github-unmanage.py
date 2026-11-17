#!/usr/bin/env python3
"""Check old GitHub state is forgotten, never destroyed, without GitHub credentials."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
terraform = os.environ.get("TERRAFORM_BIN", "terraform")
env = {k: v for k, v in os.environ.items() if not k.startswith(("GITHUB_", "GH_", "TF_VAR_"))}
with tempfile.TemporaryDirectory(prefix="kings-road-github-migration-") as tmp:
    directory = Path(tmp)
    (directory / "main.tf").write_text('''terraform {
  required_providers {
    github = {
      source = "integrations/github"
      version = "~> 6.13"
    }
  }
}
''')
    shutil.copy(root / "deploy/github.tf", directory / "removed.tf")
    lock = (root / "deploy/.terraform.lock.hcl").read_text()
    github_lock = re.search(r'provider "registry\.terraform\.io/integrations/github" \{.*?\n\}', lock, re.S)
    assert github_lock, "The migration provider must remain locked until old state has been detached."
    (directory / ".terraform.lock.hcl").write_text(github_lock.group() + "\n")

    def run(*args):
        result = subprocess.run([terraform, *args], cwd=directory, env=env,
                                capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)
        return result.stdout

    run("init", "-input=false", "-lockfile=readonly", "-no-color")
    schema = json.loads(run("providers", "schema", "-json"))["provider_schemas"]["registry.terraform.io/integrations/github"]["resource_schemas"]
    samples = {
        "github_repository_pages.site": {"id": "kings-road", "repository": "kings-road", "build_type": "workflow"},
        "github_repository_environment.pages": {"id": "kings-road:github-pages", "repository": "kings-road", "environment": "github-pages"},
        "github_actions_variable.measurement_id": {"id": "kings-road:GA_MEASUREMENT_ID", "repository": "kings-road", "variable_name": "GA_MEASUREMENT_ID", "value": "G-TESTOLD"},
    }
    resources = []
    for address, attributes in samples.items():
        kind, name = address.split(".")
        resources.append({"mode": "managed", "type": kind, "name": name,
                          "provider": 'provider["registry.terraform.io/integrations/github"]',
                          "instances": [{"schema_version": schema[kind]["version"], "attributes": attributes}]})
    (directory / "terraform.tfstate").write_text(json.dumps({
        "version": 4, "terraform_version": "1.11.4", "serial": 1,
        "lineage": "10193808-c954-493b-b468-81ed4a51f120", "outputs": {}, "resources": resources,
    }))
    run("plan", "-input=false", "-no-color", "-out=migration.tfplan")
    plan = json.loads(run("show", "-json", "migration.tfplan"))
    changes = {change["address"]: change["change"]["actions"] for change in plan["resource_changes"]}
    assert changes == {address: ["forget"] for address in samples}, changes
    print("GitHub migration passed: all three resources are forgotten without destruction or a GitHub token.")
