import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthSlot } from '@/components/auth/AuthSlot';

describe('AuthSlot Component', () => {
  it('renders character when provided', () => {
    render(
      <AuthSlot
        char="5"
        isActive={false}
        hasFakeCaret={false}
        placeholderChar={null}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders active state with border and text highlight', () => {
    const { container } = render(
      <AuthSlot
        char="A"
        isActive={true}
        hasFakeCaret={false}
        placeholderChar={null}
      />
    );
    const slotDiv = container.firstChild as HTMLElement;
    expect(slotDiv.className).toContain('border-[#FFC554]');
    expect(slotDiv.className).toContain('text-[#FFC554]');
  });

  it('renders inactive state styling when not active', () => {
    const { container } = render(
      <AuthSlot
        char={null}
        isActive={false}
        hasFakeCaret={false}
        placeholderChar={null}
      />
    );
    const slotDiv = container.firstChild as HTMLElement;
    expect(slotDiv.className).toContain('border-white/10');
  });

  it('renders fake caret when hasFakeCaret is true', () => {
    const { container } = render(
      <AuthSlot
        char={null}
        isActive={true}
        hasFakeCaret={true}
        placeholderChar={null}
      />
    );
    const caret = container.querySelector('.animate-caret-blink');
    expect(caret).toBeInTheDocument();
  });
});
