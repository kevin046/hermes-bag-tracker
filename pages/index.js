export default function Home() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
      <!DOCTYPE html>
      <html lang="en">
        <!-- Your existing HTML content -->
      </html>
    `}} />
  )
} 