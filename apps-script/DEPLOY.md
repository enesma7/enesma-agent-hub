# Transaction Center roster update

Merging the Agent Hub pull request does not deploy this. The live web app is the Apps Script project already published at the `API_URL` in `config.js`. Paste this update into that project and deploy a new version. Create a new project only if you no longer have the Transaction Center script.

The web app must keep **Execute as: Me** (the owner, enrique@enesmabroker.com). Photos are created in that account’s Drive, in a folder named `ENESMA Agent Photos`.

## 1. Add the file

1. Open the Transaction Center Apps Script project.
2. Add a script file named `RosterPublic`.
3. Paste the full contents of `apps-script/RosterPublic.gs`. Save.

## 2. Allow the public roster without a sign-in

`publicAgents` must run when no token is sent, same as `ping` and `login`. If the script returns “Sign in required” before it looks at the action, add `publicAgents` next to those actions.

Inside the existing action switch, after the signed-in user is known (use `null` when the request is unauthenticated):

```javascript
var rosterResult = rosterDispatch_(action, body, user || null);
if (rosterResult !== null) return rosterResult;
```

`user` must be the same object `me` already returns (`role`, `roles`, `owner`). `saveAgentPhoto` allows only `role === 'admin'` or `owner === true`.

At the top of the existing `doGet(e)`:

```javascript
var rosterGet = rosterMaybeGet_(e);
if (rosterGet) return rosterGet;
```

## 3. Spreadsheet

The script uses the active spreadsheet, or script property `SPREADSHEET_ID` (also `SS_ID`, `SHEET_ID`, or `TC_SPREADSHEET_ID`).

It reads the first sheet it finds, in this order: `EB_Agents`, `Agents`, `Users`.

Active rows are the roster. A row is left off when `active` is false/no/0 or `status` contains offboarded, inactive, disabled, terminated, or removed. Onboarding adds a row. Offboarding sets that flag. The Hub does not keep its own agent list.

Public columns, any header capitalization: name (or first and last), email, phone, title, languages, dre, website, bio, facebook, instagram, tiktok, x, linkedin, youtube, zillow, photoUrl. `languages` is comma-separated, for example `English, Spanish`.

`photoUrl` and `photoFileId` are added to the header row on the first upload if they are missing.

These columns are never returned, even if the sheet has them: address, mailing address, SSN, TIN, tax id, date of birth, bank, routing, account, split, cap, password.

## 4. Deploy

1. Deploy → Manage deployments → Edit (pencil) → New version → Deploy.
2. Leave it as a web app, Execute as Me, and the same access setting the Hub already uses.
3. Confirm the `/exec` URL did not change. If it did, update `API_URL` in `config.js`.
4. Check Drive for `ENESMA Agent Photos` after the first upload. The file is shared as anyone with the link, viewer, so the public sites can show the image. The spreadsheet stays private.

## 5. Smoke test

```bash
curl -sL -X POST "$API_URL" \
  -H 'Content-Type: text/plain;charset=utf-8' \
  --data '{"action":"publicAgents"}'
```

A signed-in admin uploads from the agent’s Hub profile (**Upload Photo** / **Change Photo**). The roster response then includes `photoUrl`, and the Agents page shows it without another publish.
