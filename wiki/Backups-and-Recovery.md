# Backups and Recovery

TF2Do stores the current workspace in IndexedDB in your browser. Opening a different browser profile or switching between addresses such as `127.0.0.1:5173` and `127.0.0.1:4173` opens a separate workspace. Clearing site data can erase both the workspace and its browser recovery copy.

## Export a workspace

1. Open **Workspace & backups**.
2. Select **Export workspace** and keep the JSON file somewhere you can find it again.
3. If you plan to report a bug, reproduce it in the demo workspace or with fictional data before sharing any export. Backup files include task and note text.

## Restore or move a workspace

1. Export a copy of the destination workspace if you want to keep it.
2. Open **Workspace & backups → Choose JSON backup**. The importer accepts schema version 1 files up to 5 MB. A very large export can exceed this limit.
3. Check the incoming project, task, and note counts in the preview.
4. Confirm that the incoming file will replace the whole workspace, then select **Replace workspace**. Wait for **Saved in this browser**. Invalid files cannot be confirmed. **Cancel import** closes the preview and leaves the current workspace intact.

## Recover the workspace from before a replacement

Each successful replacement retains one copy of the previously saved workspace in the same browser. Select **Export recovery backup** to download that copy. To restore it, use the import workflow above. Keep the downloaded file if you need to preserve it across another replacement.

## Handle a save error

The app keeps the current changes visible after a save failure. Use **Retry save** for a temporary storage error, or **Export unsaved work** to keep a separate copy. If another tab saved a newer workspace, export any unsaved work and reload the stale tab. The importer replaces the entire workspace, so review both exports before replacing newer work.

[Back to the wiki home](Home.md)
