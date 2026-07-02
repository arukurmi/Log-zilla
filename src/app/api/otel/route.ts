import { NextRequest, NextResponse } from 'next/server';
import { eventVault } from '@/core/eventVault';

// POST endpoint to receive logs
export async function POST(request: NextRequest) {
  try {
    let body = await request.json();
    const headers = request.headers;

    // Normalize the payload into a list of events
    let incoming = [];

    if (Array.isArray(body)) {
      body = body.map((event) => {
        if (event.meta && typeof event.meta === 'object') {
          const meta = event.meta;
          delete event.meta;
          event = { ...event, ...meta };
        }
        return event;
      });
      incoming = body;
    } else {
      if (body.meta && typeof body.meta === 'object') {
        const meta = body.meta;
        delete body.meta;
        body = { ...body, ...meta };
      }
      incoming = [body];
    }

    // Persist every event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stored = incoming.map((event: any) =>
      eventVault.store(event, headers),
    );

    return NextResponse.json(
      {
        success: true,
        count: stored.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error processing logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process logs',
      },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('query') || '';
    const level = searchParams.get('level') || '';
    const service = searchParams.get('service') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any = {};
    if (query) filters.query = query;
    if (level) filters.level = level;
    if (service) filters.service = service;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = limit;
    if (offset) filters.offset = offset;

    const logs = eventVault.fetch(filters);
    const totalCount = eventVault.count(filters);

    // Distinct levels and services drive the filter dropdowns
    const levels = eventVault.levels();
    const services = eventVault.services();

    return NextResponse.json(
      {
        success: true,
        count: logs.length,
        totalCount: totalCount,
        logs: logs,
        levels: levels,
        services: services,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve logs',
      },
      { status: 500 },
    );
  }
}

// DELETE endpoint to clear logs
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    eventVault.purge({ service, endDate });
    return NextResponse.json(
      {
        success: true,
        message: 'Logs cleared successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error clearing logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear logs',
      },
      { status: 500 },
    );
  }
}
