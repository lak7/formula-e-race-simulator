import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { plants } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const type = searchParams.get('type');
    const growthStage = searchParams.get('growthStage');

    let query = db.select().from(plants);

    // Build where conditions
    const conditions = [];
    
    if (type) {
      conditions.push(eq(plants.type, type));
    }
    
    if (growthStage !== null) {
      const stage = parseInt(growthStage);
      if (!isNaN(stage) && stage >= 0 && stage <= 5) {
        conditions.push(eq(plants.growthStage, stage));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(plants.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}