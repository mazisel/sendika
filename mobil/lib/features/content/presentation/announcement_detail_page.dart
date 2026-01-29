import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import '../../../widgets/attachment_tile.dart';
import '../domain/announcement.dart';

class AnnouncementDetailPage extends StatelessWidget {
  const AnnouncementDetailPage({super.key, required this.announcement});

  final Announcement announcement;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final formatter = DateFormat('d MMMM y', 'tr_TR');
    final dateText = [
      if (announcement.startDate != null)
        formatter.format(announcement.startDate!.toLocal()),
      if (announcement.endDate != null)
        formatter.format(announcement.endDate!.toLocal()),
    ].join(' - ');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Duyuru Detayı'),
        actions: [
          IconButton(
            onPressed: () => _shareContent(context),
            icon: const Icon(Icons.share_outlined),
            tooltip: 'Paylaş',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        children: [
          Row(
            children: [
              _AnnouncementBadge(type: announcement.type),
              const Spacer(),
              if (dateText.isNotEmpty)
                Text(
                  dateText,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.6),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            announcement.title,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            announcement.plainText,
            style: theme.textTheme.bodyLarge?.copyWith(
              height: 1.5,
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
          if (announcement.attachments.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text(
              'Ekler',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            for (final attachment in announcement.attachments)
              AttachmentTile(attachment: attachment),
          ],
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => _shareContent(context),
            icon: const Icon(Icons.share_outlined),
            label: const Text('Paylaş'),
          ),
        ],
      ),
    );
  }

  void _shareContent(BuildContext context) {
    final preview = announcement.plainText;
    final text = preview.isNotEmpty
        ? '${announcement.title}\n\n$preview'
        : announcement.title;
    Share.share(text, subject: announcement.title);
  }
}

class _AnnouncementBadge extends StatelessWidget {
  const _AnnouncementBadge({required this.type});

  final String type;

  Color _badgeColor(ColorScheme scheme) {
    return switch (type) {
      'urgent' => scheme.errorContainer,
      'warning' => scheme.tertiaryContainer,
      'info' => scheme.primaryContainer,
      _ => scheme.secondaryContainer,
    };
  }

  Color _badgeTextColor(ColorScheme scheme) {
    return switch (type) {
      'urgent' => scheme.onErrorContainer,
      'warning' => scheme.onTertiaryContainer,
      'info' => scheme.onPrimaryContainer,
      _ => scheme.onSecondaryContainer,
    };
  }

  String get label => switch (type) {
    'urgent' => 'Acil',
    'info' => 'Bilgi',
    'warning' => 'Uyarı',
    _ => 'Genel',
  };

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _badgeColor(scheme),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: _badgeTextColor(scheme),
        ),
      ),
    );
  }
}
