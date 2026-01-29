import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../features/content/domain/content_attachment.dart';

class AttachmentTile extends StatelessWidget {
  const AttachmentTile({super.key, required this.attachment});

  final ContentAttachment attachment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final iconData = _iconForAttachment(attachment);
    final label = attachment.name.isNotEmpty ? attachment.name : 'Ek';

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ListTile(
        leading: Icon(iconData, color: theme.colorScheme.primary),
        title: Text(label, style: theme.textTheme.bodyMedium),
        subtitle: _buildSubtitle(theme),
        trailing: const Icon(Icons.open_in_new),
        onTap: attachment.url.isEmpty
            ? null
            : () => _openAttachment(context, attachment.url),
      ),
    );
  }

  Widget? _buildSubtitle(ThemeData theme) {
    final details = <String>[];
    if (attachment.type != null && attachment.type!.isNotEmpty) {
      details.add(attachment.type!.toUpperCase());
    }
    if (attachment.size != null && attachment.size! > 0) {
      details.add(_formatBytes(attachment.size!));
    }
    if (details.isEmpty) {
      return null;
    }
    return Text(
      details.join(' · '),
      style: theme.textTheme.labelSmall
          ?.copyWith(color: Colors.white.withValues(alpha: 0.55)),
    );
  }

  IconData _iconForAttachment(ContentAttachment attachment) {
    final type = attachment.type?.toLowerCase() ?? '';
    final name = attachment.name.toLowerCase();
    if (type.contains('pdf') || name.endsWith('.pdf')) {
      return Icons.picture_as_pdf;
    }
    if (type.contains('image') ||
        name.endsWith('.png') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg')) {
      return Icons.image_outlined;
    }
    if (type.contains('sheet') || name.endsWith('.xlsx')) {
      return Icons.table_chart_outlined;
    }
    if (type.contains('doc') || name.endsWith('.doc') || name.endsWith('.docx')) {
      return Icons.description_outlined;
    }
    return Icons.attach_file;
  }

  String _formatBytes(int bytes) {
    const kb = 1024;
    const mb = kb * 1024;
    if (bytes >= mb) {
      return '${(bytes / mb).toStringAsFixed(1)} MB';
    }
    if (bytes >= kb) {
      return '${(bytes / kb).toStringAsFixed(1)} KB';
    }
    return '$bytes B';
  }

  Future<void> _openAttachment(BuildContext context, String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      _showSnack(context, 'Ek açılamadı.');
      return;
    }
    final success = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!success && context.mounted) {
      _showSnack(context, 'Ek açılamadı.');
    }
  }

  void _showSnack(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}
