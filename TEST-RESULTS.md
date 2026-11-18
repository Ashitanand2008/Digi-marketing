# EarthNest Vercel verification

Checked on 18 November 2026 using the packaged public directory in a browser preview.

| Check | Result |
| --- | --- |
| JavaScript syntax for catalogue.js and store.js | Passed |
| vercel.json against the official Vercel JSON schema | Passed |
| Local links, section targets, CSS paths and font files | Passed |
| All eight product images decoded and opened in browser dialogs | Passed |
| All eight product prices match the USD catalogue | Passed |
| Homepage navigation and shoppable hero | Passed |
| Search, all categories, empty results and reset | Passed |
| All four price and name sort orders | Passed |
| Filtered shop URL refresh | Passed |
| Product quantities, removal and empty-cart state | Passed |
| Two totes plus one bottle total $13.83 | Passed |
| One tote plus two bottles total $18.09 | Passed |
| Cart persistence across navigation and refresh | Passed |
| Practice checkout completes and clears the cart | Passed |
| Required-field validation and enquiry text download | Passed |
| Mobile menu and product dialog at 320 px | Passed |
| Horizontal overflow at 320, 390, 768 and desktop widths | None observed |
| Application console errors during the exercised browser flows | None observed |
| Malformed/legacy stored cart data and blocked storage fallback | Passed |
| Final ZIP extraction and file-content comparison | Passed |

The final ZIP was extracted and compared byte for byte with the tested public files. The deployment configuration uses public/ with an empty build command and the Other framework preset. The site serves local HTML, CSS, JavaScript, images and fonts.

## Remaining verification

A deployment in your Vercel account has not been run. After importing or uploading the project, open the production URL and follow the short checks in README.md. These local browser and configuration checks establish how the package behaves locally. Platform availability, project-level overrides, account permissions and future platform changes must be confirmed in the deployed environment.
