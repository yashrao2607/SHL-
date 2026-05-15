import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// GET /api/assessments/search
// Query params: q, category, testType, remote, adaptive, limit
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim() ?? '';
    const category = searchParams.get('category')?.trim() ?? '';
    const testType = searchParams.get('testType')?.trim() ?? '';
    const remoteParam = searchParams.get('remote')?.trim().toLowerCase();
    const adaptiveParam = searchParams.get('adaptive')?.trim().toLowerCase();
    const limitParam = searchParams.get('limit')?.trim();
    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 100);

    // Build where conditions using Prisma types
    const conditions: Prisma.AssessmentWhereInput[] = [];

    // Free-text search across multiple fields
    if (q) {
      conditions.push({
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { skills: { contains: q } },
          { category: { contains: q } },
          { jobLevels: { contains: q } },
        ],
      });
    }

    // Category filter
    if (category) {
      conditions.push({ category: { contains: category } });
    }

    // Test type filter
    if (testType) {
      conditions.push({ testType: { contains: testType } });
    }

    // Remote filter
    if (remoteParam === 'true') {
      conditions.push({ remoteTesting: true });
    } else if (remoteParam === 'false') {
      conditions.push({ remoteTesting: false });
    }

    // Adaptive filter
    if (adaptiveParam === 'true') {
      conditions.push({ adaptive: true });
    } else if (adaptiveParam === 'false') {
      conditions.push({ adaptive: false });
    }

    // Build the where clause
    const where: Prisma.AssessmentWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const results = await db.assessment.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        url: true,
        description: true,
        testType: true,
        category: true,
        remoteTesting: true,
        adaptive: true,
        duration: true,
        jobLevels: true,
        languages: true,
        skills: true,
      },
    });

    // Get total count for pagination info
    const total = await db.assessment.count({ where });

    return NextResponse.json({
      assessments: results,
      total,
      limit,
      query: { q, category, testType, remote: remoteParam ?? '', adaptive: adaptiveParam ?? '' },
    });
  } catch (error) {
    console.error('[Assessments Search API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to search assessments. Please try again.',
        assessments: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}
