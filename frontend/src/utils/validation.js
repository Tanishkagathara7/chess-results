// Tournament validation utilities

export const validateTournamentDates = (startDate, endDate) => {
  const errors = [];
  
  if (!startDate || !endDate) {
    return errors; // Let required field validation handle empty dates
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today
  
  // Check if end date is after start date
  if (end < start) {
    errors.push('End date must be after or equal to start date');
  }
  
  // Check if start date is not too far in the past (allow 1 day grace period)
  const oneDayAgo = new Date(today);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  if (start < oneDayAgo) {
    errors.push('Start date cannot be more than 1 day in the past');
  }
  
  // Check if dates are reasonable (not more than 2 years in the future)
  const twoYearsFromNow = new Date(today);
  twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
  
  if (start > twoYearsFromNow || end > twoYearsFromNow) {
    errors.push('Tournament dates cannot be more than 2 years in the future');
  }
  
  // Check tournament duration (max 30 days, min same day)
  const durationMs = end - start;
  const durationDays = durationMs / (1000 * 60 * 60 * 24);
  
  if (durationDays > 30) {
    errors.push('Tournament duration cannot exceed 30 days');
  }
  
  // Additional business validations
  // Check for weekend tournaments (optional warning - could be removed if not needed)
  const startDay = start.getDay();
  const endDay = end.getDay();
  
  // Warn about very short tournaments on weekdays
  if (durationDays === 0 && startDay !== 0 && startDay !== 6) {
    // Single-day tournament on a weekday - might want to warn but not error
    // This is just a business suggestion, not a hard error
  }
  
  return errors;
};

export const validateTournamentForm = (formData) => {
  const errors = {};
  
  // Basic required field validation
  if (!formData.name?.trim()) {
    errors.name = 'Tournament name is required';
  } else if (formData.name.trim().length < 3) {
    errors.name = 'Tournament name must be at least 3 characters';
  } else if (formData.name.trim().length > 100) {
    errors.name = 'Tournament name cannot exceed 100 characters';
  }
  
  if (!formData.location?.trim()) {
    errors.location = 'Location is required';
  } else if (formData.location.trim().length < 2) {
    errors.location = 'Location must be at least 2 characters';
  }
  
  if (!formData.start_date) {
    errors.start_date = 'Start date is required';
  }
  
  if (!formData.end_date) {
    errors.end_date = 'End date is required';
  }
  
  if (!formData.rounds || formData.rounds < 1) {
    errors.rounds = 'Number of rounds must be at least 1';
  } else if (formData.rounds > 20) {
    errors.rounds = 'Number of rounds cannot exceed 20';
  }
  
  if (!formData.time_control?.trim()) {
    errors.time_control = 'Time control is required';
  } else {
    // Basic time control format validation (e.g., "90+30", "2h+30s", "5+3")
    const timeControlPattern = /^\d+([hms]?)(\+\d+[ms]?)?$|^\d+h\d+m(\+\d+s?)?$/i;
    if (!timeControlPattern.test(formData.time_control.replace(/\s/g, ''))) {
      errors.time_control = 'Invalid time control format (e.g., "90+30", "2h+30s", "5+3")';
    }
  }
  
  if (!formData.arbiter?.trim()) {
    errors.arbiter = 'Chief arbiter is required';
  } else if (formData.arbiter.trim().length < 2) {
    errors.arbiter = 'Arbiter name must be at least 2 characters';
  }
  
  // Date validation
  if (formData.start_date && formData.end_date) {
    const dateErrors = validateTournamentDates(formData.start_date, formData.end_date);
    if (dateErrors.length > 0) {
      errors.dates = dateErrors;
    }
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

export const formatDateError = (dateErrors) => {
  if (!dateErrors || dateErrors.length === 0) return '';
  return dateErrors.join('. ');
};
