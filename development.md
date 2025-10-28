# Development Guide

## Local Development
1. Clone repository
2. Serve `index.html` with local server
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```

## Code Structure

- **Single HTML File**: All CSS, JS, and HTML in one file for portability  
- **Modular JavaScript**: Organized by functionality domains  
- **CSS Variables**: Consistent design system  

## Adding Features

1. Follow existing patterns for new domain categories  
2. Maintain mobile-first responsive design  
3. Ensure offline functionality  
4. Include undo/redo capabilities  

## Testing

- Manual testing on multiple devices  
- Browser compatibility testing  
- PWA functionality verification  
