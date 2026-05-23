# SpendMap

SpendMap is a finance app for wallets, transactions, notes, insights, and reports.

## Quick start

1. Install dependencies.

   ```bash
   npm install
   ```

2. Install the report runner dependencies.

   ```bash
   cd functions
   npm install
   cd ..
   ```

3. Start the app.

   ```bash
   npx expo start
   ```

## Reports

- Manual exports are available from the `History` tab.
- You can export PDF or Excel reports for today, week, month, year, all time, or a custom range.
- Custom ranges use `YYYY-MM-DD` dates.

## Automation setup

To send automated email reports, add these GitHub repository secrets:

- `FIREBASE_SERVICE_ACCOUNT_JSON` - Firebase service account JSON
- `REPORTS_GMAIL_USER` - Gmail address used to send reports
- `REPORTS_GMAIL_APP_PASSWORD` - Gmail app password for SMTP
- `REPORTS_FROM_EMAIL` - optional sender override

Optional:

- `REPORTS_TIME_ZONE` - defaults to `Asia/Kolkata`

Use a Gmail account with 2-step verification enabled and create an app password for SMTP. Normal Gmail passwords will not work.

## Learn more

- [Expo docs](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [GitHub Actions schedule syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax-for-github-actions)
