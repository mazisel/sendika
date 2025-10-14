import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../features/content/domain/announcement.dart';

class AnnouncementCard extends StatelessWidget {
  const AnnouncementCard({super.key, required this.announcement});

  final Announcement announcement;

  Color _badgeColor(ColorScheme scheme) {
    return switch (announcement.type) {
      'urgent' => scheme.errorContainer,
      'warning' => scheme.tertiaryContainer,
      'info' => scheme.primaryContainer,
      _ => scheme.secondaryContainer,
    };
  }

  Color _badgeTextColor(ColorScheme scheme) {
    return switch (announcement.type) {
      'urgent' => scheme.onErrorContainer,
      'warning' => scheme.onTertiaryContainer,
      'info' => scheme.onPrimaryContainer,
      _ => scheme.onSecondaryContainer,
    };
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final formatter = DateFormat('d MMMM y', 'tr_TR');
    final dateText = [
      if (announcement.startDate != null)
        formatter.format(announcement.startDate!.toLocal()),
      if (announcement.endDate != null)
        formatter.format(announcement.endDate!.toLocal()),
    ].join(' - ');

    return Card(
      elevation: 0.5,
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: _badgeColor(scheme),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    announcement.badgeLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _badgeTextColor(scheme),
                    ),
                  ),
                ),
                const Spacer(),
                if (dateText.isNotEmpty)
                  Text(
                    dateText,
                    style: Theme.of(
                      context,
                    ).textTheme.labelMedium?.copyWith(color: Colors.blueGrey),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              announcement.title,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              announcement.content,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: Colors.blueGrey.shade700),
            ),
          ],
        ),
      ),
    );
  }
}
