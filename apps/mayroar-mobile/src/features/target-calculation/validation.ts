
import type {TargetCalculationInputs} from "./types";

export type ValidationErrors = Partial<Record<keyof TargetCalculationInputs, string>>;

export function validateInputs(inputs: TargetCalculationInputs): ValidationErrors {
    const errors: ValidationErrors = {};

    if (!Number.isInteger(inputs.age) || inputs.age < 0 || inputs.age > 100) {
        errors.age = "Age must be between 0 and 100.";
    }

    if (!Number.isFinite(inputs.height_cm) || inputs.height_cm < 50 || inputs.height_cm > 300) {
        errors.height_cm = "Height must be between 50 and 300 cm.";
    }

    if (!Number.isFinite(inputs.weight_kg) || inputs.weight_kg < 20 || inputs.weight_kg > 500) {
        errors.weight_kg = "Weight must be between 20 and 500 kg.";
    }

    const days = inputs.exercise_days_per_week;
    const minutes = inputs.exercise_minutes_per_session;

    if (!Number.isInteger(days) || days < 0 || days > 7) {
    errors.exercise_days_per_week = "Choose between 0 and 7 days.";
    }

    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 240) {
        errors.exercise_minutes_per_session =
        "Enter whole minutes between 0 and 240.";
    }

    if (days === 0) {
        if (minutes !== 0) {
            errors.exercise_minutes_per_session =
                "Use 0 minutes when you do not exercise.";
            }

        if (inputs.exercise_type !== "none") {
            errors.exercise_type = "Choose no exercise for 0 exercise days.";
        }
    } else if (days > 0) {
        if (minutes === 0) {
            errors.exercise_minutes_per_session =
            "Enter how long each exercise session lasts.";
        }

        if (inputs.exercise_type === "none") {
            errors.exercise_type = "Choose the type of exercise you do.";
        }
    }

    const bodyFat = inputs.body_fat_percent;
    if (bodyFat !== null) {
        if (!Number.isFinite(bodyFat) || bodyFat <= 0 || bodyFat >= 70) {
            errors.body_fat_percent =
                "Enter a body-fat percentage above 0 and below 70.";
        }

        if (inputs.body_fat_source === null) {
            errors.body_fat_source = "Choose how this estimate was obtained.";
        }
    }

     const measuredOn = inputs.body_fat_measured_on;

    if (measuredOn !== null) {
        if (!isValidDateOnly(measuredOn)) {
            errors.body_fat_measured_on = "Enter a valid date as YYYY-MM-DD.";
        } else if (bodyFat === null) {
            errors.body_fat_measured_on =
            "Enter a body-fat percentage before adding its measurement date.";
        }
    }

    return errors;
}

function isValidDateOnly(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00.000Z`);

    return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}
 