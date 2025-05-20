import app from './app';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const port = process.env.PORT || 3000;

// Add error handling for the server
const server = app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`💬 Webhook endpoint: http://localhost:${port}/webhook`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(`Port ${port} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${port} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});
