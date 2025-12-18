import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/competitions/[id] - Get single competition details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

    const selectColumns = [
      '*',
      'sponsors:competition_sponsors(*)',
      'submission_count:competition_submissions(count)',
    ].join(',');

    const { data: competition, error } = await supabase
      .from('competitions')
      .select(selectColumns)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching competition:', error);
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ competition });
  } catch (error) {
    console.error('Error in GET /api/competitions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/competitions/[id] - Update competition (admin only)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check admin status
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS for updates
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const {
      sponsors,
      ...competitionData
    }: {
      sponsors?: {
        name: string;
        logo_url: string;
        website_url?: string;
        description?: string;
        display_order?: number;
      }[];
      [key: string]: unknown;
    } = body;

    // Update competition
    const { data: competition, error: updateError } = await supabaseAdmin
      .from('competitions')
      .update(competitionData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating competition:', updateError);
      return NextResponse.json(
        { error: 'Failed to update competition' },
        { status: 500 }
      );
    }

    // Update sponsors if provided
    if (sponsors !== undefined) {
      // Delete existing sponsors
      await supabaseAdmin
        .from('competition_sponsors')
        .delete()
        .eq('competition_id', id);

      // Insert new sponsors
      if (sponsors.length > 0) {
        const sponsorsToInsert = sponsors.map((sponsor, index) => ({
          competition_id: id,
          name: sponsor.name,
          logo_url: sponsor.logo_url,
          website_url: sponsor.website_url,
          description: sponsor.description,
          display_order: sponsor.display_order ?? index,
        }));

        const { error: sponsorsError } = await supabaseAdmin
          .from('competition_sponsors')
          .insert(sponsorsToInsert);

        if (sponsorsError) {
          console.error('Error updating sponsors:', sponsorsError);
        }
      }
    }

    return NextResponse.json({ competition });
  } catch (error) {
    console.error('Error in PUT /api/competitions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/competitions/[id] - Delete competition (admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check admin status
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS for deletion
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete competition (sponsors, submissions, evaluations will cascade)
    const { error } = await supabaseAdmin
      .from('competitions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting competition:', error);
      return NextResponse.json(
        { error: 'Failed to delete competition' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/competitions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
