#!/bin/bash

# Load environment variables from .env.production
if [ -f .env.production ]; then
  export $(cat .env.production | sed 's/#.*//g' | xargs)
fi

# Run the build command
npm run build
