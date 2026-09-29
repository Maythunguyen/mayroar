from pathlib import Path

import pytest
from openpyxl import load_workbook

from food_reference.sources.fsanz_afcd import FsanzAfcd


def _nutrients(bundle, fid: str) -> dict[str, float]:  # type: ignore[no-untyped-def]
    return {n["nutrient_code"]: n["amount_per_100g"] for n in bundle.food_nutrients if n["food_id"] == fid}


def test_finds_header_row_under_the_title(raw_dir: Path) -> None:
    bundle = FsanzAfcd().extract(raw_dir)
    assert [f["id"] for f in bundle.foods] == [
        "fsanz_afcd:F000001",
        "fsanz_afcd:F000002",
        "fsanz_afcd:F000003",
    ]
    assert bundle.foods[0]["description"] == "Breast, no skin"


def test_energy_is_converted_from_kilojoules(raw_dir: Path) -> None:
    chicken = _nutrients(FsanzAfcd().extract(raw_dir), "fsanz_afcd:F000001")
    assert chicken["energy_kcal"] == pytest.approx(98.5)
    assert chicken["protein"] == 22.5


def test_empty_cell_is_not_stored_as_zero(raw_dir: Path) -> None:
    milk = _nutrients(FsanzAfcd().extract(raw_dir), "fsanz_afcd:F000002")
    assert "vitamin_d" not in milk


def test_label_data_foods_are_marked_as_label(raw_dir: Path) -> None:
    tiers = {f["id"]: f["quality_tier"] for f in FsanzAfcd().extract(raw_dir).foods}
    assert tiers["fsanz_afcd:F000003"] == "label"
    assert tiers["fsanz_afcd:F000001"] == "reference"


def test_only_liquids_get_millilitre_portions(raw_dir: Path) -> None:
    portions = FsanzAfcd().extract(raw_dir).portions
    assert {p["food_id"] for p in portions} == {"fsanz_afcd:F000002"}
    assert {p["label"]: p["grams"] for p in portions} == {"100 mL": 103.0, "1 metric cup (250 mL)": 257.5}


def test_renamed_column_stops_with_a_clear_message(raw_dir: Path) -> None:
    path = raw_dir / "fsanz_afcd" / "AFCD_Release_3_-_Nutrient_profiles.xlsx"
    wb = load_workbook(path)
    wb["All solids & liquids per 100 g"]["F3"] = "Protein total (g)"
    wb.save(path)
    with pytest.raises(ValueError, match="Protein"):
        FsanzAfcd().extract(raw_dir)


@pytest.mark.parametrize(
    "profiles_name, details_name",
    [
        ("AFCD Release 3 - Nutrient profiles.xlsx", "AFCD Release 3 - Food Details.xlsx"),
        ("AFCD Release 3 - Nutrient\u00a0profiles.xlsx", "AFCD Release 3 - Food\u00a0Details.xlsx"),
        ("afcd-release-3-nutrient-profiles.xlsx", "afcd-release-3-food-details.xlsx"),
    ],
)
def test_file_names_as_downloaded_are_recognised(
    raw_dir: Path, profiles_name: str, details_name: str
) -> None:
    folder = raw_dir / "fsanz_afcd"
    (folder / "AFCD_Release_3_-_Nutrient_profiles.xlsx").rename(folder / profiles_name)
    (folder / "AFCD_Release_3_-_Food_Details.xlsx").rename(folder / details_name)
    assert len(FsanzAfcd().raw_files(raw_dir)) == 2


def test_documentation_files_in_the_folder_are_ignored(raw_dir: Path) -> None:
    folder = raw_dir / "fsanz_afcd"
    (folder / "AFCD Release 3 - Nutrient details.xlsx").write_bytes(b"not used")
    names = {p.name for p in FsanzAfcd().raw_files(raw_dir)}
    assert "AFCD Release 3 - Nutrient details.xlsx" not in names
