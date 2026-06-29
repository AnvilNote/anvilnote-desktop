# Bundled templates

Optional template files staged into the app at `dist/app/templates` and exposed
to the renderer through `ANVILNOTE_TEMPLATE_DIR`.

Note: the renderer also ships its own `templates/` directory (copied next to its
build by `scripts/copy-renderer.mjs`). Use this directory only for templates that
should override or extend the renderer's built-in set at runtime.

Keep this README so the directory is preserved in git.
