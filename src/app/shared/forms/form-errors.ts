import { AbstractControl, FormGroup } from '@angular/forms';

/**
 * Pushes the backend's flat `errors` map onto matching controls. Returns any messages whose field
 * has no control, so the caller can show them at form level instead of dropping them.
 */
export function applyServerErrors(form: FormGroup, fieldErrors: Record<string, string>): string[] {
  const unmatched: string[] = [];

  for (const [field, message] of Object.entries(fieldErrors)) {
    const control = form.get(field);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: message });
      control.markAsTouched();
    } else {
      unmatched.push(message);
    }
  }

  return unmatched;
}

/** French message for a control, preferring whatever the server said. */
export function errorMessageFor(control: AbstractControl | null): string | null {
  if (!control?.touched || !control.errors) {
    return null;
  }

  const errors = control.errors;
  if (errors['server']) {
    return errors['server'] as string;
  }
  if (errors['required']) {
    return 'Ce champ est obligatoire';
  }
  if (errors['email']) {
    return 'Adresse e-mail invalide';
  }
  if (errors['minlength']) {
    return `Au moins ${errors['minlength'].requiredLength} caractères`;
  }
  if (errors['maxlength']) {
    return `Au plus ${errors['maxlength'].requiredLength} caractères`;
  }
  return 'Valeur invalide';
}
