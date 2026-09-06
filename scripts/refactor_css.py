import sys

def process_app_css(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add --radius-leaf
    content = content.replace(
        '  --radius-full: 9999px;',
        '  --radius-full: 9999px;\n  --radius-leaf: 2rem 0.5rem 2rem 0.5rem;'
    )

    # Midnight theme update
    old_midnight = """[data-theme="midnight"] {
  --color-primary:            #00e479;
  --color-primary-rgb:        0, 228, 121;
  --color-primary-container:  #00ff88;
  --color-on-primary:         #003919;
  --color-secondary:          #ecb1ff;
  --color-secondary-container:#d05bff;
  --color-tertiary:           #fefafa;
  --color-tertiary-container: #e1dedd;
  --color-on-tertiary:        #313030;
  --color-surface:            #131313;
  --color-surface-dim:        #131313;
  --color-surface-container:  #20201f;
  --color-surface-container-low: #1c1b1b;
  --color-surface-container-high: #2a2a2a;
  --color-on-surface:         #e5e2e1;
  --color-on-surface-variant: #b9cbb9;
  --color-outline:            #849585;
  --color-outline-variant:    #3b4b3d;
  --color-error:              #ffb4ab;
  --color-accent-gold:        #ffe099;

  --glass-bg: rgba(26, 26, 26, 0.45);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: 0 0 30px rgba(0, 228, 121, 0.1);

  --scrim: linear-gradient(
    rgba(19,19,19,0.85) 0%,
    rgba(19,19,19,0.45) 18%,
    rgba(19,19,19,0.45) 68%,
    rgba(19,19,19,0.90) 100%
  );
}"""
    new_midnight = """[data-theme="midnight"] {
  --color-primary:            #84a98c;
  --color-primary-rgb:        132, 169, 140;
  --color-primary-container:  #52796f;
  --color-on-primary:         #1a2421;
  --color-secondary:          #cad2c5;
  --color-secondary-container:#84a98c;
  --color-tertiary:           #354f52;
  --color-tertiary-container: #2f3e46;
  --color-on-tertiary:        #cad2c5;
  --color-surface:            #1a2421;
  --color-surface-dim:        #1a2421;
  --color-surface-container:  #2f3e46;
  --color-surface-container-low: #202a25;
  --color-surface-container-high: #354f52;
  --color-on-surface:         #cad2c5;
  --color-on-surface-variant: #84a98c;
  --color-outline:            #52796f;
  --color-outline-variant:    #354f52;
  --color-error:              #ffb4ab;
  --color-accent-gold:        #ffe099;

  --glass-bg: rgba(26, 36, 33, 0.95);
  --glass-border: rgba(255, 255, 255, 0.05);
  --glass-shadow: none;

  --scrim: linear-gradient(
    rgba(26,36,33,0.85) 0%,
    rgba(26,36,33,0.45) 18%,
    rgba(26,36,33,0.45) 68%,
    rgba(26,36,33,0.90) 100%
  );
}"""
    content = content.replace(old_midnight, new_midnight)

    # Glass panel
    old_glass_panel = """.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}"""
    new_glass_panel = """.glass-panel {
  background: var(--color-surface-container-low);
  border: 1px solid var(--color-outline-variant);
  box-shadow: none;
}"""
    content = content.replace(old_glass_panel, new_glass_panel)

    # Glows
    old_glows = """.bioluminescent-line {
  background: linear-gradient(90deg, #ecb1ff 0%, #00e479 100%);
}

.glow-emerald {
  box-shadow: 0 0 20px rgba(0, 228, 121, 0.2);
}

.glow-text-emerald {
  text-shadow: 0 0 10px rgba(0, 228, 121, 0.5);
}"""
    new_glows = """/* Bioluminescent / glow classes removed for tactile minimalism */"""
    content = content.replace(old_glows, new_glows)

    # Top nav
    old_top_nav = """.ws-top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  z-index: 50;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}"""
    new_top_nav = """.ws-top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  z-index: 50;
  background: var(--color-surface-container-low);
  border-bottom: 1px solid var(--color-outline-variant);
  box-shadow: none;
}"""
    content = content.replace(old_top_nav, new_top_nav)

    # Logo text
    content = content.replace(
        '  text-shadow: 0 0 15px rgba(0, 228, 121, 0.3);',
        ''
    )

    # Side nav
    old_side_nav = """.ws-side-nav {
  position: fixed;
  left: 0;
  top: 80px;
  bottom: 0;
  width: 256px;
  z-index: 40;
  display: none;
  flex-direction: column;
  padding: var(--space-md);
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--glass-border);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}"""
    new_side_nav = """.ws-side-nav {
  position: fixed;
  left: 0;
  top: 80px;
  bottom: 0;
  width: 256px;
  z-index: 40;
  display: none;
  flex-direction: column;
  padding: var(--space-md);
  background: var(--color-surface-container-low);
  border-right: 1px solid var(--color-outline-variant);
  box-shadow: none;
}"""
    content = content.replace(old_side_nav, new_side_nav)

    old_nav_active = """.ws-side-nav__nav-item--active {
  color: var(--color-on-primary);
  background: var(--color-primary);
  box-shadow: 0 0 20px rgba(0, 228, 121, 0.4);
}"""
    new_nav_active = """.ws-side-nav__nav-item--active {
  color: var(--color-on-primary);
  background: var(--color-primary);
  box-shadow: none;
}"""
    content = content.replace(old_nav_active, new_nav_active)

    old_powerups = """.ws-side-nav__powerups {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, rgba(236,177,255,0.15) 0%, rgba(0,228,121,0.1) 100%);
  border: 1px solid var(--glass-border);
}"""
    new_powerups = """.ws-side-nav__powerups {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
}"""
    content = content.replace(old_powerups, new_powerups)

    # Daily goal card
    content = content.replace(
        '  border-radius: var(--radius-2xl);\n  margin-bottom: var(--space-md);',
        '  border-radius: var(--radius-leaf);\n  margin-bottom: var(--space-md);'
    )

    # Control Btn
    old_control_btn = """.ws-control-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px 18px;
  border-radius: var(--radius-xl);
  background: var(--color-surface-container-high);
  border: 1px solid var(--glass-border);
  color: var(--color-on-surface);
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.ws-control-btn:hover {
  background: rgba(0, 228, 121, 0.16);
  border-color: rgba(0, 228, 121, 0.4);
  color: var(--color-primary);
  box-shadow: 0 0 16px rgba(0, 228, 121, 0.2);
  transform: translateY(-1px);
}

.ws-control-btn:active {
  transform: translateY(0);
}"""
    new_control_btn = """.ws-control-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px 18px;
  border-radius: var(--radius-xl);
  background: var(--color-surface-container-high);
  border: 1px solid var(--color-outline-variant);
  color: var(--color-on-surface);
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 2px 4px 0px rgba(15, 82, 56, 0.15), inset 1px 1px 0px rgba(255, 255, 255, 0.5);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.ws-control-btn:hover {
  background: var(--color-surface-container);
  color: var(--color-primary);
}

.ws-control-btn:active {
  transform: translate(2px, 4px);
  box-shadow: none;
}"""
    content = content.replace(old_control_btn, new_control_btn)

    # Primary Action btn
    old_primary_btn = """.ws-primary-action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 12px 24px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--color-primary) 0%, #00b862 100%);
  color: #0b1d14;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-family: var(--font-headline);
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 0 25px rgba(0, 228, 121, 0.4);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.ws-primary-action-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 0 35px rgba(0, 228, 121, 0.6);
  filter: brightness(1.1);
}

.ws-primary-action-btn:active {
  transform: translateY(0) scale(0.98);
}"""
    new_primary_btn = """.ws-primary-action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 12px 24px;
  border-radius: var(--radius-leaf);
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-family: var(--font-headline);
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 2px 4px 0px rgba(15, 82, 56, 0.3), inset 1px 1px 0px rgba(255, 255, 255, 0.2);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.ws-primary-action-btn:hover {
  background: var(--color-primary-container);
}

.ws-primary-action-btn:active {
  transform: translate(2px, 4px);
  box-shadow: none;
}"""
    content = content.replace(old_primary_btn, new_primary_btn)

    # Found words panel
    content = content.replace(
        '.ws-found-words-panel {\n  border-radius: var(--radius-2xl);',
        '.ws-found-words-panel {\n  border-radius: var(--radius-leaf);'
    )

    # Bottom nav
    old_bottom_nav = """.ws-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border-top: 1px solid var(--glass-border);
}"""
    new_bottom_nav = """.ws-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--color-surface-container-low);
  border-top: 1px solid var(--color-outline-variant);
}"""
    content = content.replace(old_bottom_nav, new_bottom_nav)

    # Success overlay
    content = content.replace('  text-shadow: 0 0 25px rgba(0, 228, 121, 0.6);', '')

    with open(filepath, 'w') as f:
        f.write(content)

process_app_css('/home/chip/Projects/WordSearch/src/App.css')
print("Updated App.css")
