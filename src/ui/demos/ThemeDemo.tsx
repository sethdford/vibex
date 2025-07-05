import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import ThemeToggle from '../components/ThemeToggle';

const ThemeDemo: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('colors');

  const ColorSwatch: React.FC<{ color: string; name: string }> = ({ color, name }) => (
    <div className="flex flex-col items-center space-y-2">
      <div
        className="w-12 h-12 rounded-lg border"
        style={{
          backgroundColor: color,
          border: `1px solid ${theme.colors.border.secondary}`,
        }}
      />
      <span className="text-xs font-mono" style={{ color: theme.colors.text.tertiary }}>
        {name}
      </span>
    </div>
  );

  const ColorPalette: React.FC<{ title: string; colors: Record<string, string> }> = ({ title, colors }) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
        {title}
      </h3>
      <div className="grid grid-cols-6 gap-3">
        {Object.entries(colors).map(([key, value]) => (
          <ColorSwatch key={key} color={value} name={key} />
        ))}
      </div>
    </div>
  );

  const Button: React.FC<{ variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error'; children: React.ReactNode }> = ({ variant, children }) => {
    const variants = {
      primary: { bg: theme.colors.primary[500], text: theme.colors.text.inverse },
      secondary: { bg: theme.colors.background.secondary, text: theme.colors.text.primary },
      success: { bg: theme.colors.success[500], text: theme.colors.text.inverse },
      warning: { bg: theme.colors.warning[500], text: theme.colors.text.inverse },
      error: { bg: theme.colors.error[500], text: theme.colors.text.inverse },
    };

    return (
      <button
        style={{
          background: variants[variant].bg,
          color: variants[variant].text,
          border: `1px solid ${variants[variant].bg}`,
          padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
          borderRadius: theme.borderRadius.md,
          fontWeight: theme.typography.fontWeight.medium,
          transition: `all ${theme.animations.duration.fast} ${theme.animations.easing.inOut}`,
          cursor: 'pointer',
        }}
        className="hover:opacity-90"
      >
        {children}
      </button>
    );
  };

  const tabs = [
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'components', label: 'Components' },
  ];

  return (
    <div
      style={{
        background: theme.colors.background.primary,
        color: theme.colors.text.primary,
        fontFamily: theme.typography.fontFamily.sans.join(', '),
        minHeight: '100vh',
        transition: `all ${theme.animations.duration.normal} ${theme.animations.easing.inOut}`,
      }}
      className="p-8"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: theme.colors.text.primary }}>
              VibeX Enterprise Theme System
            </h1>
            <p className="text-lg mt-2" style={{ color: theme.colors.text.secondary }}>
              {theme.name} ({theme.mode} mode)
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle variant="button" showLabel size="md" />
            <ThemeToggle variant="switch" showLabel size="md" />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? theme.colors.primary[500] : theme.colors.background.secondary,
                color: activeTab === tab.id ? theme.colors.text.inverse : theme.colors.text.primary,
                border: `1px solid ${activeTab === tab.id ? theme.colors.primary[500] : theme.colors.border.primary}`,
                borderRadius: theme.borderRadius.md,
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                transition: `all ${theme.animations.duration.fast} ${theme.animations.easing.inOut}`,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            background: theme.colors.background.elevated,
            border: `1px solid ${theme.colors.border.primary}`,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.boxShadow.md,
            padding: theme.spacing[6],
          }}
        >
          {activeTab === 'colors' && (
            <div className="space-y-8">
              <ColorPalette title="Primary Colors" colors={theme.colors.primary} />
              <ColorPalette title="Success Colors" colors={theme.colors.success} />
              <ColorPalette title="Warning Colors" colors={theme.colors.warning} />
              <ColorPalette title="Error Colors" colors={theme.colors.error} />
              <div className="grid grid-cols-2 gap-8">
                <ColorPalette title="Background" colors={theme.colors.background} />
                <ColorPalette title="Text" colors={theme.colors.text} />
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-6" style={{ color: theme.colors.text.primary }}>
                  Font Sizes
                </h3>
                <div className="space-y-4">
                  {Object.entries(theme.typography.fontSize).map(([size, [fontSize]]) => (
                    <div key={size} className="flex items-center justify-between">
                      <span
                        style={{
                          fontSize,
                          color: theme.colors.text.primary,
                        }}
                      >
                        Sample text in {size} ({fontSize})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-6" style={{ color: theme.colors.text.primary }}>
                  Font Weights
                </h3>
                <div className="space-y-4">
                  {Object.entries(theme.typography.fontWeight).map(([weight, value]) => (
                    <div key={weight}>
                      <span
                        style={{
                          fontWeight: value,
                          color: theme.colors.text.primary,
                        }}
                      >
                        {weight} ({value}) - The quick brown fox jumps over the lazy dog
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text.primary }}>
                  Buttons
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="warning">Warning</Button>
                  <Button variant="error">Error</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text.primary }}>
                  Theme Toggles
                </h3>
                <div className="flex items-center space-x-6">
                  <ThemeToggle variant="icon" size="sm" />
                  <ThemeToggle variant="icon" size="md" />
                  <ThemeToggle variant="icon" size="lg" />
                  <ThemeToggle variant="button" showLabel size="md" />
                  <ThemeToggle variant="switch" showLabel size="lg" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text.primary }}>
                  Cards
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        background: theme.colors.background.secondary,
                        border: `1px solid ${theme.colors.border.secondary}`,
                        borderRadius: theme.borderRadius.lg,
                        padding: theme.spacing[4],
                      }}
                    >
                      <h4 className="font-semibold mb-2" style={{ color: theme.colors.text.primary }}>
                        Card {i}
                      </h4>
                      <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                        Sample card with themed styling
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-sm" style={{ color: theme.colors.text.tertiary }}>
            VibeX Enterprise Theme System - Professional, Accessible, Modern
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThemeDemo; 