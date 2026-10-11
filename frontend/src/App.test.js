import { render, screen } from '@testing-library/react';
import App from './App';

test('renders AdvTools title', () => {
  render(<App />);
  const titleElement = screen.getByText(/AdvTools/i);
  expect(titleElement).toBeInTheDocument();
});
