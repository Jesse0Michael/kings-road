#!/usr/bin/env python3
"""GA4 operations not exposed by the pinned Terraform provider; stdlib only."""
import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser

API = "https://analyticsadmin.googleapis.com/v1alpha/"
STREAM = r"properties/[0-9]+/dataStreams/[0-9]+"


def api(method, resource, body=None, query=None):
    token = os.environ.get("GOOGLE_OAUTH_ACCESS_TOKEN")
    if not token:
        raise ValueError("Set GOOGLE_OAUTH_ACCESS_TOKEN to a short-lived token with analytics.edit scope.")
    url = API + resource
    if query:
        url += "?" + urllib.parse.urlencode(query)
    req = urllib.request.Request(url, method=method, headers={
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
    }, data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=30) as response:
        text = response.read()
        return json.loads(text) if text else {}


def configure(stream, settings):
    if not re.fullmatch(STREAM, stream):
        raise ValueError("Expected properties/NUMBER/dataStreams/NUMBER.")
    resource = stream + "/enhancedMeasurementSettings"
    current = api("GET", resource)
    if any(current.get(k) != v for k, v in settings.items()):
        api("PATCH", resource, {"name": resource, **settings},
            {"updateMask": ",".join(sorted(settings))})
    print("Enhanced measurement configured for " + stream)


def all_items(resource, field, query=None):
    query = dict(query or {})
    while True:
        page = api("GET", resource, query=query)
        yield from page.get(field, [])
        if not page.get("nextPageToken"):
            break
        query["pageToken"] = page["nextPageToken"]


class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources = []

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            src = dict(attrs).get("src")
            if src:
                self.sources.append(src)


def public_text(url):
    # Public build verification never receives the Google access token.
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read().decode("utf-8")


def verify_cutover(site_url, new_id, old_id):
    html = public_text(site_url)
    parser = Scripts()
    parser.feed(html)
    bundles = []
    origin = urllib.parse.urlsplit(site_url).netloc
    for source in parser.sources:
        url = urllib.parse.urljoin(site_url, source)
        if urllib.parse.urlsplit(url).netloc == origin:
            bundles.append(public_text(url))
    code = "\n".join(bundles)
    if not bundles or new_id not in code or old_id in code or old_id in html:
        raise ValueError("The live site's JavaScript has not switched exclusively to the new Measurement ID. Nothing deleted.")


def retire(account_id, old_id, replacement_stream):
    if (not re.fullmatch(r"[0-9]+", account_id)
            or not re.fullmatch(STREAM, replacement_stream)
            or not re.fullmatch(r"G-[A-Z0-9]+", old_id)):
        raise ValueError("Use a numeric account ID and Terraform's stream_name output.")
    replacement = api("GET", replacement_stream)
    new_property = replacement_stream.split("/dataStreams/")[0]
    prop = api("GET", new_property)
    if prop.get("parent") != "accounts/" + account_id:
        raise ValueError("Replacement property is not in the requested Analytics account.")
    web = replacement.get("webStreamData", {})
    new_id = web.get("measurementId", "")
    if not re.fullmatch(r"G-[A-Z0-9]+", new_id) or new_id == old_id:
        raise ValueError("Replacement must be a different, valid web stream.")
    candidates = []
    for prop in all_items("properties", "properties", {"filter": "parent:accounts/" + account_id}):
        name = prop["name"]
        streams = list(all_items(name + "/dataStreams", "dataStreams"))
        if any(s.get("webStreamData", {}).get("measurementId") == old_id for s in streams):
            if len(streams) != 1 or name == new_property:
                raise ValueError("Old property has other streams or is the replacement; refusing to delete it.")
            candidates.append(name)
    if not candidates:
        print("No active property contains the old Measurement ID; nothing to delete.")
        return
    if len(candidates) != 1:
        raise ValueError("Old Measurement ID did not identify exactly one property.")
    verify_cutover(web["defaultUri"], new_id, old_id)
    api("DELETE", candidates[0])
    print("Moved old property " + candidates[0] + " to Trash. Replacement: " + new_property)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("configure")
    cleanup = commands.add_parser("retire")
    cleanup.add_argument("--account-id", required=True)
    cleanup.add_argument("--old-measurement-id", required=True)
    cleanup.add_argument("--replacement-stream", required=True)
    args = parser.parse_args()
    if args.command == "configure":
        configure(os.environ["GA_STREAM"], json.loads(os.environ["GA_SETTINGS"]))
    else:
        retire(args.account_id, args.old_measurement_id, args.replacement_stream)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
