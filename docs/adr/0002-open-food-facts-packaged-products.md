# 2. Packaged products come from Open Food Facts

Date: 2026-09-24. Status: accepted.

## Context

AFCD and USDA describe generic foods. People also eat branded, packaged
products, which they want to find by scanning a barcode. No free, complete
list of Australian supermarket products exists. Copying supermarket
websites breaks their terms of use, and the nutrition panels belong to the
brands.

## Decision

Packaged products come from Open Food Facts, a volunteer database
published every night under the Open Database License. "fetch" reads the
published Parquet export and keeps only products tagged as sold in
Australia. We never bulk download through their live API: their rules
allow one API call per real user scan only.

How their data is translated, based on the real Australian extract:

Only per 100 g values are used. Products without any are dropped, since
they cannot be logged by weight.

Open Food Facts stores minerals and vitamins in grams. Sodium, calcium,
iron and magnesium are multiplied by 1,000 (to mg), vitamin D by
1,000,000 (to ug).

Energy comes only from "energy-kcal", or "energy-kj" divided by 4.184.
The plain "energy" field mixes units and is never used.

"carbohydrates" maps to available carbohydrate, matching Australian
labels. A few imported products may carry US labels, which include fibre.

Salt is ignored because it repeats sodium. Alcohol is ignored because it
is stored as % volume, not grams.

Every product is quality_tier "label". The basis records whether the
label gave values per 100 g, per 100 mL, or per serving (converted by
Open Food Facts).

## Consequences

Around 66,000 Australian products become searchable and scannable. Their
data is less reliable than lab data, which the app must make visible.
The database built from them is share-alike under the ODbL, with credit to
Open Food Facts, stored in reference.food_sources.
