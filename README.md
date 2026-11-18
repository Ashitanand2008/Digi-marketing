# EarthNest for Vercel

The complete editable EarthNest storefront with USD prices is in **public/**. This is a static HTML, CSS and JavaScript site. Its images and fonts are bundled locally.

## Deploy using GitHub and Vercel

1. Extract the ZIP with **Extract All**.
2. Create a GitHub repository and upload the contents of this folder. The repository's top level should contain **vercel.json** and the **public/** folder. Keep all of public/assets/ when uploading.
3. In Vercel, choose **Add New → Project**, select the GitHub repository and click **Import**.
4. Use the following settings. The included vercel.json also supplies them.

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Root Directory | The folder containing vercel.json |
| Build Command | Empty |
| Output Directory | public |
| Install Command | Default, with no package dependencies |
| Environment Variables | None required |

5. Click **Deploy**. Open the production URL Vercel returns.
6. Open Shop, add two cotton totes, and confirm the subtotal is **$6.38**. Refresh to confirm the cart persists.

If you uploaded the outer EarthNest-Vercel folder into an existing repository, select that folder as Vercel's Root Directory.

## Deploy from your terminal

With Node.js installed, open a terminal in the extracted folder containing vercel.json and run:

```sh
npx vercel --prod
```

Follow the Vercel login and project prompts. Set the project directory to the current folder when asked. The included configuration selects public/ as the output directory.

## Run locally

With Python installed, open a terminal in the extracted folder and run:

```sh
python -m http.server 8000 --directory public
```

Then open **http://localhost:8000/**. Use the same address and port between visits to keep the same browser cart. VS Code Live Server can also serve public/index.html.

## Source files

| File or folder | Purpose |
| --- | --- |
| public/index.html | Homepage, story, values, sustainability tips and contact |
| public/shop.html | Product collection and filtering controls |
| public/style.css | Responsive design, typography and motion |
| public/catalogue.js | Eight illustrative listings, USD prices and product details |
| public/store.js | Search, sorting, cart, product dialogs and demo checkout |
| public/assets/ | Product photography, hero images, brand mark and local fonts |
| vercel.json | Static-site deployment settings |
| .vercelignore | Keeps setup documents out of CLI uploads |
| TEST-RESULTS.md | Verification scope and results |

Prices use integer cents. For example, **priceCents: 319** displays as **$3.19**. Integer arithmetic keeps line totals and cart totals consistent.

Edit the source files and commit them to the connected repository to trigger Vercel's next deployment. Update the title and description metadata in the two HTML files when changing the brand. Once you have a permanent public domain, you can add an absolute social-preview image URL for that domain.

## What to check after publishing

- The homepage, shop.html and a filtered shop URL open directly.
- All eight images appear and product details open.
- Categories, search and all four price/name sort orders work.
- Two totes plus one bottle total **$13.83**.
- Quantity adjustment and removal update the cart immediately.
- The cart survives a refresh.
- Demo checkout completes and clears the cart.
- The mobile menu and dialogs fit on a phone.

## Prototype behaviour

The cart lives in the visitor's browser. Blocking all browser storage limits it to the current visit. Checkout simulates an order. Contact enquiries create a downloadable text draft. Payments, order fulfilment and email delivery require production services.

The storefront is served as static files and executes in the browser. The deployment configuration was checked against Vercel's official JSON schema. Local load, navigation and shopping-flow results are recorded in TEST-RESULTS.md. Publication in your own Vercel account remains to be verified after deployment.

## Official references

- Deploying to Vercel  
  https://vercel.com/docs/deployments
- Vercel project configuration  
  https://vercel.com/docs/project-configuration/vercel-json
- Vercel command-line deployment  
  https://vercel.com/docs/cli/deploy
