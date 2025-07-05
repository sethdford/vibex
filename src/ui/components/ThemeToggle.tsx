import React from 'react';
import { useTheme } from '../contexts/ThemeContext.js';

export interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'switch';
  showLabel?: boolean;
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  variant = 'icon',
  showLabel = false,
  className = '',
}) => {
  const { theme, toggleThemeMode, isDarkTheme } = useTheme();
  const toggleTheme = toggleThemeMode;
  const isLoading = false;

  // Create theme adapter for backward compatibility
  const adaptedTheme = {
    mode: isDarkTheme ? 'dark' : 'light',
    colors: {
      background: {
        primary: theme.ui.background,
        elevated: theme.ui.background,
      },
      text: {
        primary: theme.ui.text,
        secondary: theme.ui.textDim,
      },
      border: {
        primary: theme.ui.textDim,
      },
      primary: {
        600: theme.ui.primary,
      },
      neutral: {
        300: theme.ui.textDim,
      },
    },
    borderRadius: {
      full: '9999px',
      md: '0.375rem',
    },
    boxShadow: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    animations: {
      duration: {
        normal: '300ms',
      },
      easing: {
        inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg',
  };

  const buttonSizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const switchSizeClasses = {
    sm: 'w-10 h-5',
    md: 'w-12 h-6',
    lg: 'w-14 h-7',
  };

  const switchThumbClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${sizeClasses[size]} ${className}`}>
        <div className="w-full h-full bg-gray-300 rounded-full"></div>
      </div>
    );
  }

  const iconStyles = {
    background: adaptedTheme.colors.background.elevated,
    color: adaptedTheme.colors.text.primary,
    border: `1px solid ${adaptedTheme.colors.border.primary}`,
    borderRadius: adaptedTheme.borderRadius.full,
    boxShadow: adaptedTheme.boxShadow.sm,
    transition: `all ${adaptedTheme.animations.duration.normal} ${adaptedTheme.animations.easing.inOut}`,
  };

  const buttonStyles = {
    background: adaptedTheme.colors.background.elevated,
    color: adaptedTheme.colors.text.primary,
    border: `1px solid ${adaptedTheme.colors.border.primary}`,
    borderRadius: adaptedTheme.borderRadius.md,
    boxShadow: adaptedTheme.boxShadow.sm,
    transition: `all ${adaptedTheme.animations.duration.normal} ${adaptedTheme.animations.easing.inOut}`,
  };

  const switchStyles = {
    background: adaptedTheme.mode === 'dark' ? adaptedTheme.colors.primary[600] : adaptedTheme.colors.neutral[300],
    borderRadius: adaptedTheme.borderRadius.full,
    transition: `all ${adaptedTheme.animations.duration.normal} ${adaptedTheme.animations.easing.inOut}`,
    position: 'relative' as const,
    cursor: 'pointer',
  };

  const switchThumbStyles = {
    background: adaptedTheme.colors.background.primary,
    borderRadius: adaptedTheme.borderRadius.full,
    boxShadow: adaptedTheme.boxShadow.sm,
    transition: `all ${adaptedTheme.animations.duration.normal} ${adaptedTheme.animations.easing.bounce}`,
    transform: adaptedTheme.mode === 'dark' 
      ? size === 'sm' ? 'translateX(20px)' : size === 'md' ? 'translateX(24px)' : 'translateX(28px)'
      : 'translateX(2px)',
    position: 'absolute' as const,
    top: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const SunIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );

  const MoonIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );

  const handleToggle = () => {
    toggleTheme();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`${sizeClasses[size]} ${className} flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2`}
        style={iconStyles}
        aria-label={`Switch to ${adaptedTheme.mode === 'light' ? 'dark' : 'light'} mode`}
        title={`Switch to ${adaptedTheme.mode === 'light' ? 'dark' : 'light'} mode`}
      >
        <div
          className="transition-transform duration-300 ease-in-out"
          style={{
            transform: adaptedTheme.mode === 'dark' ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          {adaptedTheme.mode === 'light' ? <SunIcon /> : <MoonIcon />}
        </div>
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`${buttonSizeClasses[size]} ${className} flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2`}
        style={buttonStyles}
        aria-label={`Switch to ${adaptedTheme.mode === 'light' ? 'dark' : 'light'} mode`}
      >
        <div
          className="transition-transform duration-300 ease-in-out"
          style={{
            transform: adaptedTheme.mode === 'dark' ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          {adaptedTheme.mode === 'light' ? <SunIcon /> : <MoonIcon />}
        </div>
        {showLabel && (
          <span className="font-medium">
            {adaptedTheme.mode === 'light' ? 'Light' : 'Dark'}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'switch') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {showLabel && (
          <span
            className="text-sm font-medium"
            style={{ color: adaptedTheme.colors.text.secondary }}
          >
            Theme
          </span>
        )}
        <div
          className={switchSizeClasses[size]}
          style={switchStyles}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          role="switch"
          aria-checked={adaptedTheme.mode === 'dark'}
          aria-label={`Switch to ${adaptedTheme.mode === 'light' ? 'dark' : 'light'} mode`}
          tabIndex={0}
        >
          <div
            className={switchThumbClasses[size]}
            style={switchThumbStyles}
          >
            <div
              className="transition-transform duration-300 ease-in-out"
              style={{
                transform: adaptedTheme.mode === 'dark' ? 'rotate(180deg)' : 'rotate(0deg)',
                fontSize: size === 'sm' ? '10px' : size === 'md' ? '12px' : '14px',
              }}
            >
              {adaptedTheme.mode === 'light' ? <SunIcon /> : <MoonIcon />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ThemeToggle; 