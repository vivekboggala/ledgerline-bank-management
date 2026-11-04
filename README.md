# Ledgerline Bank Management

Ledgerline is an India-focused, browser-based bank operations demo built with HTML, CSS, and vanilla JavaScript. It uses Indian sample customers, INR rupee formatting, India-time dates, and Savings, Current, and Salary account types.

## Run locally

Open `index.html` in a modern browser. No package installation or build step is required. Customer, account, and transaction records are stored in that browser using `localStorage`.

## Features

- Create, view, update, and delete customer records.
- Create, view, update, and delete Savings, Current, and Salary accounts.
- Record deposits and withdrawals for active accounts.
- Update account balances from transactions and prevent withdrawals that exceed the available balance.
- Search customers, accounts, and transaction activity.
- View branch totals and recent account activity.
- Preserve demo data between visits in the same browser.

## Deploy with GitHub Pages

The workflow at `.github/workflows/pages.yml` deploys the static site whenever a commit is pushed to `main`, or when started manually from the Actions tab.

1. Push this project to a GitHub repository on the `main` branch.
2. In the repository, open **Settings → Pages**.
3. Set the build and deployment source to **GitHub Actions**.
4. Open **Actions** and wait for the Pages deployment workflow to finish. GitHub will display the published site URL in the workflow run and Pages settings.

## Git commands

For an existing GitHub repository, use the repository's URL as `REMOTE_URL`:

```powershell
git init -b main
git add .
git commit -m "Build Ledgerline bank management demo"
git remote add origin REMOTE_URL
git push -u origin main
```

## Important

This is a user-interface prototype with fictional sample data, not a banking system. It has no server, authentication, authorization, database, audit service, or financial controls. Do not enter real customer information or use it to manage real money. Production financial software requires a reviewed backend, strong access controls, encryption, compliance controls, and security testing.