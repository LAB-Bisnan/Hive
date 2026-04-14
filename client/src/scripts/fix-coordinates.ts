export async function fixPropertyCoordinates() {
  try {
    const response = await fetch('/api/fix-coordinates', {
      method: 'POST',
    });
    const result = await response.json();
    console.log('Coordinates fixed:', result);
  } catch (error) {
    console.error('Error fixing coordinates:', error);
  }
}