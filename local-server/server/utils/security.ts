export const validatePassword = (password: string, contextName?: string): { isValid: boolean; message?: string } => {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecial) {
    return { 
      isValid: false, 
      message: 'Password must include uppercase, lowercase, numbers, and special characters.' 
    };
  }

  if (contextName && contextName.length >= 3) {
    const lowerPass = password.toLowerCase();
    const nameParts = contextName.toLowerCase().split(/\s+/).filter(p => p.length >= 3);
    for (const part of nameParts) {
      if (lowerPass.includes(part)) {
        return { isValid: false, message: 'Password must not contain parts of the business name or username.' };
      }
    }
  }

  return { isValid: true };
};
