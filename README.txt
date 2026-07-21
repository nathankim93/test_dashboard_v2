# 1088 Operations Dashboard

## Local
1. Open_Dashboard.bat → http://127.0.0.1:5200/
2. Update_All_Data.bat → refresh public/data/*.json

## GitHub Pages
URL: https://nathankim93.github.io/test_dashboard_v1/

### One-time setup on GitHub
1. Settings → Pages → Source = **GitHub Actions**
2. Push these updates to main (see below)
3. Actions tab → wait for "Deploy GitHub Pages" to succeed
4. Open URL + Ctrl+F5

### Files added for Pages
- vite.config.ts  (base path for /test_dashboard_v1/)
- .github/workflows/deploy.yml  (build + deploy dist)

### Push from your PC (Git required)
```
cd C:\Users\nkim60\1088_Ops_Dashboard
git add .
git commit -m "Add GitHub Pages deploy workflow"
git push origin main
```

If this folder is not yet linked to the repo:
```
git init
git remote add origin https://github.com/nathankim93/test_dashboard_v1.git
git add .
git commit -m "Configure GitHub Pages deploy"
git branch -M main
git push -u origin main --force
```
(Only use --force if you intend to replace the remote main with this Hub folder.)

## Sheets
1. Inventory Status
2. Receiving Status
3. Highbay Healthiness
