import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { plants } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    // Query plant by ID
    const plant = await db
      .select()
      .from(plants)
      .where(eq(plants.id, parseInt(id)))
      .limit(1);

    // Check if plant exists
    if (plant.length === 0) {
      return NextResponse.json(
        { error: 'Plant not found' },
        { status: 404 }
      );
    }

    // Return the plant
    return NextResponse.json(plant[0], { status: 200 });
  } catch (error) {
    console.error('GET plant by ID error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}