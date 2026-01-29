import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import '../../../widgets/attachment_tile.dart';
import '../domain/news_item.dart';

class NewsDetailPage extends StatelessWidget {
  const NewsDetailPage({super.key, required this.item});

  final NewsItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateLabel = item.publishedAt != null
        ? DateFormat('d MMMM y', 'tr_TR').format(item.publishedAt!.toLocal())
        : null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Haber Detayı'),
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
          if (item.imageUrl != null && item.imageUrl!.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  item.imageUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: theme.colorScheme.surfaceContainerHigh,
                    alignment: Alignment.center,
                    child: Icon(
                      Icons.newspaper,
                      size: 48,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
              ),
            ),
          if (item.imageUrl != null && item.imageUrl!.isNotEmpty)
            const SizedBox(height: 16),
          if (dateLabel != null)
            Text(
              dateLabel,
              style: theme.textTheme.labelMedium?.copyWith(
                color: Colors.white.withValues(alpha: 0.6),
              ),
            ),
          const SizedBox(height: 8),
          Text(
            item.title,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            item.plainText,
            style: theme.textTheme.bodyLarge?.copyWith(
              height: 1.5,
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
          if (item.attachments.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text(
              'Ekler',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            for (final attachment in item.attachments)
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
    final preview = item.preview;
    final text = preview.isNotEmpty
        ? '${item.title}\n\n$preview'
        : item.title;
    Share.share(text, subject: item.title);
  }
}
