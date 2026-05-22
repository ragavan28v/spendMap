# SpendMap

SpendMap is an Expo app for tracking wallets, transactions, notes, analytics, and reports.

## Local setup

1. Install the app dependencies:

   ```bash
   npm install
   ```

2. Install the monthly-report runner dependencies:

   ```bash
   cd functions
   npm install
   cd ..
   ```

3. Start the app:

   ```bash
   npx expo start
   ```

## Monthly report system

The report system now has two paths:

- **Automatic monthly reports** run from GitHub Actions using `.github/workflows/monthly-reports.yml`
- **Manual report exports** are available in the `History` tab under **Generate report**

You can export:

- PDF
- Excel

You can also choose:

- Today
- Week
- Month
- Year
- All time
- Custom date range

For custom range exports, enter dates in `YYYY-MM-DD` format.

## Required setup

To make automated email reports work, add these GitHub repository secrets:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — full Firebase service account JSON
- `REPORTS_GMAIL_USER` — Gmail address used to send reports
- `REPORTS_GMAIL_APP_PASSWORD` — Gmail app password for SMTP
- `REPORTS_FROM_EMAIL` — optional sender override

Optional:

- `REPORTS_TIME_ZONE` — defaults to `Asia/Kolkata` in the workflow

### Firebase service account

Create a service account in Google Cloud / Firebase with Firestore read and write access, then store the full JSON in the `FIREBASE_SERVICE_ACCOUNT_JSON` secret.

### Gmail setup

Use a Gmail account with 2-step verification enabled and create an app password for SMTP. Normal Gmail passwords will not work for this workflow.

## Cost notes

- GitHub Actions is free for public repositories.
- Private repositories use the included Actions minutes from your GitHub plan.
- If you need true zero-cost automation for a private repo, use a self-hosted runner.

## Manual report export

Open the `History` tab, then:

1. Pick a report scope.
2. Optionally enter a custom date range.
3. Tap `PDF` or `Excel`.
4. Share or save the generated file from the device share sheet.

## Learn more

- [Expo docs](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [GitHub Actions schedule syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax-for-github-actions)

