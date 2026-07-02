import { NextResponse } from 'next/server';
import { eventVault } from '@/core/eventVault';

export async function GET() {
  try {
    const size = eventVault.sizeOnDisk();
    return NextResponse.json(
      {
        success: true,
        size: size,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error getting database size:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get database size',
      },
      { status: 500 },
    );
  }
}
