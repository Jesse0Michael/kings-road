import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("analytics_admin", Path(__file__).with_name("analytics-admin.py"))
admin = importlib.util.module_from_spec(spec)
spec.loader.exec_module(admin)


class AnalyticsAdminTests(unittest.TestCase):
    def test_configure_only_patches_changed_settings(self):
        with patch.object(admin, "api", return_value={"streamEnabled": True}) as api:
            admin.configure("properties/1/dataStreams/2", {"streamEnabled": True})
            self.assertEqual(api.call_count, 1)
        with patch.object(admin, "api", return_value={"streamEnabled": False}) as api:
            admin.configure("properties/1/dataStreams/2", {"streamEnabled": True})
            self.assertEqual(api.call_args.args[0], "PATCH")
            self.assertEqual(api.call_args.args[3], {"updateMask": "streamEnabled"})

    def test_cutover_requires_new_id_without_old_and_ignores_external_scripts(self):
        def text(url):
            if url.endswith(".js"):
                return 'const id="G-NEW123";'
            return '<script src="./assets/game.js"></script><script src="https://other.example/tag.js"></script>'
        with patch.object(admin, "public_text", side_effect=text) as fetch:
            admin.verify_cutover("https://game.example/", "G-NEW123", "G-OLD123")
            self.assertEqual(fetch.call_count, 2)
        with patch.object(admin, "public_text", return_value='<script src="game.js"></script>G-OLD123 G-NEW123'):
            with self.assertRaises(ValueError):
                admin.verify_cutover("https://game.example/", "G-NEW123", "G-OLD123")

    def test_retirement_checks_account_streams_and_published_build(self):
        def run(extra=False, blocked=False):
            def api(method, resource, *args, **kwargs):
                if method == "DELETE":
                    return {}
                if resource == "properties/2/dataStreams/22":
                    return {"webStreamData": {"measurementId": "G-NEW123", "defaultUri": "https://game.example/"}}
                if resource == "properties/2":
                    return {"parent": "accounts/123"}
                if resource == "properties":
                    return {"properties": [{"name": "properties/1"}]}
                if resource == "properties/1/dataStreams":
                    rows = [{"webStreamData": {"measurementId": "G-OLD123"}}]
                    if extra:
                        rows.append({"webStreamData": {"measurementId": "G-UNRELATED"}})
                    return {"dataStreams": rows}
                raise AssertionError(resource)
            with patch.object(admin, "api", side_effect=api) as call, patch.object(admin, "verify_cutover", side_effect=ValueError("not deployed") if blocked else None):
                if extra or blocked:
                    with self.assertRaises(ValueError):
                        admin.retire("123", "G-OLD123", "properties/2/dataStreams/22")
                    self.assertFalse(any(c.args[0] == "DELETE" for c in call.call_args_list))
                else:
                    admin.retire("123", "G-OLD123", "properties/2/dataStreams/22")
                    self.assertEqual(call.call_args.args, ("DELETE", "properties/1"))
        run()
        run(extra=True)
        run(blocked=True)

    def test_retirement_rejects_a_replacement_in_another_account(self):
        with patch.object(admin, "api", side_effect=[{}, {"parent": "accounts/999"}]) as api:
            with self.assertRaises(ValueError):
                admin.retire("123", "G-OLD123", "properties/2/dataStreams/22")
            self.assertFalse(any(c.args[0] == "DELETE" for c in api.call_args_list))


if __name__ == "__main__":
    unittest.main()
