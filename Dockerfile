# Use the official Node.js 20.2.0 image with Alpine Linux as the base image
FROM node:20.2.0-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of your application code to the container
COPY . .

# Expose the port your Node.js application will listen on
EXPOSE 3001

# Use nodemon for development (install it globally)
RUN npm install -g nodemon

# Define the startup command using nodemon
CMD ["nodemon", "exampleBasic.js"]