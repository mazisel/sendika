import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../features/content/domain/news_item.dart';

class NewsCard extends StatelessWidget {
  const NewsCard({super.key, required this.item, this.onTap});

  final NewsItem item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final dateLabel = item.publishedAt != null
        ? DateFormat('d MMMM y', 'tr_TR').format(item.publishedAt!.toLocal())
        : null;

    return Card(
      elevation: 1,
      margin: const EdgeInsets.symmetric(vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (item.imageUrl != null && item.imageUrl!.isNotEmpty)
              AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  item.imageUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: Colors.blueGrey.shade50,
                    alignment: Alignment.center,
                    child: const Icon(Icons.newspaper, size: 48),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (dateLabel != null) ...[
                    Text(
                      dateLabel,
                      style: Theme.of(
                        context,
                      ).textTheme.labelSmall?.copyWith(color: Colors.blueGrey),
                    ),
                    const SizedBox(height: 8),
                  ],
                  Text(
                    item.title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item.preview,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.blueGrey.shade700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
