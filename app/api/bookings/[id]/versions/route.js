import { jsonOk, jsonError } from '@/lib/api';
import { requireBookingAccess } from '@/lib/requireBookingAccess';
import { getVersion, listVersions } from '@/services/versionService';
import { previewRevert, revertBooking } from '@/services/revertService';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const { searchParams } = new URL(request.url);
    const versionNumber = searchParams.get('version');

    if (versionNumber) {
      const version = await getVersion(id, Number(versionNumber));
      return jsonOk(version);
    }

    const versions = await listVersions(id);
    return jsonOk(versions);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const body = await request.json();

    if (body.action === 'preview') {
      const preview = await previewRevert(id, body.targetVersion, body.mode || 'full', {
        section: body.section,
        fieldName: body.fieldName,
      });
      return jsonOk(preview);
    }

    if (body.action === 'revert') {
      const result = await revertBooking({
        bookingId: id,
        targetVersionNumber: body.targetVersion,
        mode: body.mode || 'full',
        section: body.section,
        fieldName: body.fieldName,
        fileId: body.fileId,
        actor: gate.actor,
      });
      return jsonOk(result);
    }

    return jsonError('Unknown action', 400);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
