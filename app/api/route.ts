// This file ensures Next.js doesn't try to handle API routes on the frontend
// All API calls should be redirected to Railway backend

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect('https://storybook-backend-production-cb71.up.railway.app/api');
}

export async function POST() {
  return NextResponse.redirect('https://storybook-backend-production-cb71.up.railway.app/api');
}

export async function PUT() {
  return NextResponse.redirect('https://storybook-backend-production-cb71.up.railway.app/api');
}

export async function DELETE() {
  return NextResponse.redirect('https://storybook-backend-production-cb71.up.railway.app/api');
}