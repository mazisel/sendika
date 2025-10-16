import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../widgets/news_card.dart';
import '../../../content/providers/content_providers.dart';

class NewsPage extends ConsumerWidget {
  const NewsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final newsAsync = ref.watch(newsFutureProvider);
    final theme = Theme.of(context);

    return newsAsync.when(
      data: (items) => RefreshIndicator(
        onRefresh: () => ref.refresh(newsFutureProvider.future),
        child: items.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  const SizedBox(height: 120),
                  Center(
                    child: Text(
                      'Yayınlanmış haber bulunmuyor.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.65),
                      ),
                    ),
                  ),
                ],
              )
            : ListView.builder(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 16,
                ),
                physics: const AlwaysScrollableScrollPhysics(),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  return NewsCard(item: items[index]);
                },
              ),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 120),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                Icon(Icons.error_outline,
                    size: 48, color: theme.colorScheme.error),
                const SizedBox(height: 12),
                Text(
                  'Haberler yüklenemedi.\n${error.toString()}',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.refresh(newsFutureProvider),
                  child: const Text('Tekrar dene'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
