import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../widgets/announcement_card.dart';
import '../../../content/providers/content_providers.dart';

class AnnouncementsPage extends ConsumerWidget {
  const AnnouncementsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final announcementsAsync = ref.watch(announcementsFutureProvider);

    return announcementsAsync.when(
      data: (items) => RefreshIndicator(
        onRefresh: () => ref.refresh(announcementsFutureProvider.future),
        child: items.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text('Aktif duyuru bulunmuyor.')),
                ],
              )
            : ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 16,
                ),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  return AnnouncementCard(announcement: items[index]);
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
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 12),
                Text(
                  'Duyurular yüklenemedi.\n${error.toString()}',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.refresh(announcementsFutureProvider),
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
