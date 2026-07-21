# 1088 Operations Dashboard

## Local
1. `Open_Dashboard.bat` → http://127.0.0.1:5200/
2. `Update_All_Data.bat` → refresh `public/data/*.json`

## GitHub Pages URL
https://nathankim93.github.io/test_dashboard_v1/

### First-time Pages setup (GitHub web)
1. Repo **Settings → Pages**
2. **Source**: GitHub Actions (not "Deploy from a branch")
3. Push to `main` (workflow: `.github/workflows/deploy.yml`)
4. Wait for Actions to finish (green check)
5. Open the URL above and Ctrl+F5

### Update the live site
```
Update_All_Data.bat   # optional: refresh JSON
git add .
git commit -m "Update dashboard"
git push
```
Actions rebuilds and redeploys automatically.

## Sheets
1. Inventory Status
2. Receiving Status
3. Highbay Healthiness
