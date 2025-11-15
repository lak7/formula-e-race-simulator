import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, plants } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { duration, sessionType, completedAt } = body;

    // Validate required fields
    if (!duration) {
      return NextResponse.json(
        { error: 'Duration is required', code: 'MISSING_DURATION' },
        { status: 400 }
      );
    }

    if (!sessionType || typeof sessionType !== 'string' || sessionType.trim() === '') {
      return NextResponse.json(
        { error: 'Session type is required and must be a non-empty string', code: 'MISSING_SESSION_TYPE' },
        { status: 400 }
      );
    }

    // Validate duration is a positive integer
    const parsedDuration = parseInt(duration);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      return NextResponse.json(
        { error: 'Duration must be a positive integer', code: 'INVALID_DURATION' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Create new session
    const newSession = await db.insert(sessions)
      .values({
        duration: parsedDuration,
        sessionType: sessionType.trim(),
        completedAt: completedAt || now,
        createdAt: now,
      })
      .returning();

    // Plant growth logic
    // Query for the most recent plant
    const mostRecentPlant = await db.select()
      .from(plants)
      .orderBy(desc(plants.id))
      .limit(1);

    if (mostRecentPlant.length === 0) {
      // No plant exists, create the first plant
      await db.insert(plants)
        .values({
          type: 'cactus',
          growthStage: 0,
          sessionsCompleted: 0,
          createdAt: now,
          updatedAt: now,
        });
    } else {
      // Plant exists, update it
      const currentPlant = mostRecentPlant[0];
      const newSessionsCompleted = currentPlant.sessionsCompleted + 1;
      const newGrowthStage = Math.min(currentPlant.growthStage + 1, 5);

      await db.update(plants)
        .set({
          sessionsCompleted: newSessionsCompleted,
          growthStage: newGrowthStage,
          updatedAt: now,
        })
        .where(eq(plants.id, currentPlant.id));

      // If growthStage reaches 5, create a new plant
      if (newGrowthStage === 5) {
        const plantTypes = ['cactus', 'succulent', 'flower', 'tree', 'bamboo'];
        const randomType = plantTypes[Math.floor(Math.random() * plantTypes.length)];

        await db.insert(plants)
          .values({
            type: randomType,
            growthStage: 0,
            sessionsCompleted: 0,
            createdAt: now,
            updatedAt: now,
          });
      }
    }

    return NextResponse.json(newSession[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    
    // Optional filter by sessionType
    const sessionType = searchParams.get('sessionType');

    let query = db.select().from(sessions);

    // Apply sessionType filter if provided
    if (sessionType) {
      query = query.where(eq(sessions.sessionType, sessionType));
    }

    // Order by completedAt DESC (most recent first) and apply pagination
    const results = await query
      .orderBy(desc(sessions.completedAt))
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