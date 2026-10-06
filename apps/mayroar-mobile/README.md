# MayRoar mobile

React Native / Expo SDK 57 nutrition prototype for `apps/mayroar-mobile` in the MayRoar monorepo.

Read the package's root `START_HERE.md` for installation, Supabase setup, native development builds, and verification limits.

```bash
npm ci
npm run web
```

Copy `.env.example` to `.env` and supply the public Supabase URL and publishable key when the mobile food-search migration has been applied. Leave the variables empty to use custom foods and the local diary first.

The app reads the public food catalogue and stores personal diary records in local SQLite. It does not write to the reference catalogue or sync personal records to Supabase.

The UI uses Geist, MayRoar's cream/charcoal/olive/pink palette, and SVG assets exported from the supplied Figma file. Native safe areas supply the operating system status and home indicator; they are not mocked as static graphics.

Diary entries snapshot the food's original nutrient and source values. Quantities scale per-100-g data without rounding stored totals. Incomplete or obviously invalid core values cannot be logged. Missing fibre and sugar values are shown as unknown or partial coverage.

The earlier food-data analysis flags are not automatically applied to the catalogue by this app. Review flagged records in the pipeline separately. The new SQL migration corrects missing-carb handling and adds source metadata and measured portions.

```bash
npm run typecheck
npm run lint
npm test
```

Only nutrition is active in this first version. Accounts, 2FA, workouts, cycle tracking, and cloud sync remain future work.
