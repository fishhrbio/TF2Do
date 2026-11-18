# GitHub handoff

## Repository details

| Field           | Suggested value                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository name | `TF2Do`                                                                                                                                               |
| Description     | A personal biotechnology research planner for tasks, project notes, and weekly planning. Built by Robert Waite, a USF biotechnology graduate student. |
| Topics          | `biotechnology`, `task-management`, `research-planning`, `react`, `typescript`, `indexeddb`                                                           |
| First release   | `v0.1.0`, titled **TF2Do 0.1.0**                                                                                                                      |

Use the repository visibility chosen by Robert. The current source has a copyright notice and no open-source license. If an open-source release is intended, add the owner’s selected license and align the package metadata before publishing. [GitHub licensing guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

## Post the source

1. Create `TF2Do` on GitHub. An empty repository allows the first local commit to be pushed directly. If it already has commits, clone it and copy the package into the clone so existing history is preserved.
2. From the extracted `TF2Do` directory, use the confirmed repository URL in place of `OWNER`. Use a Git identity associated with the maintainer’s GitHub account.

   ```sh
   git init -b main
   git add .
   git diff --cached --stat
   git commit -m "Release TF2Do 0.1.0"
   git remote add origin https://github.com/OWNER/TF2Do.git
   git push -u origin main
   ```

3. Set the repository description and topics. Check the **Actions** run on `main` after the push. Use [the draft release notes](RELEASE-0.1.0.md) if publishing the `v0.1.0` GitHub Release.

## Publish the Wiki

1. Enable Wikis under the repository’s **Settings → General → Features** if the repository plan and visibility support it.
2. Open **Wiki** in the repository, save the first **Home** page to initialize the wiki Git repository, and copy its clone URL.
3. Clone the wiki into a directory next to the source checkout. Extract the contents of `TF2Do-v0.1.0-wiki.zip` into the root of that wiki clone. The ZIP contains `Home.md`, the content pages, and `_Sidebar.md`. Keep the wiki clone’s existing `.git` directory. The wiki links use `fishhrbio/TF2Do`. If the repo is under a different owner, update the repository path in the wiki links before pushing.
4. Review the changes and push from the wiki clone’s checked-out default branch.

   ```sh
   git add Home.md How-to-Use.md Backups-and-Recovery.md Architecture.md Roadmap.md _Sidebar.md
   git diff --cached --stat
   git commit -m "Publish TF2Do wiki"
   git push
   ```

5. Open the published **Home** page and follow all sidebar links. The Markdown sources under [wiki](../wiki/Home.md) also work directly from the source repository, including when the Wiki tab is unavailable. [GitHub wiki publishing guide](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages)
