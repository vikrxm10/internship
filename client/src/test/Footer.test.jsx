import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuthContext } from '../context/AuthContext';
import Footer from '../components/Footer';
import { BrowserRouter } from 'react-router-dom';

describe('Footer Component', () => {
  it('renders the footer content', () => {
    const mockContextValue = {
      user: { name: 'Test User', role: 'RESTAURANT' }
    };
    
    render(
      <AuthContext.Provider value={mockContextValue}>
        <BrowserRouter>
          <Footer />
        </BrowserRouter>
      </AuthContext.Provider>
    );
    
    const footerElement = screen.getByRole('contentinfo');
    expect(footerElement).toBeInTheDocument();
  });
});
