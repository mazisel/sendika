import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/application/auth_controller.dart';
import '../../content/providers/content_providers.dart';
import 'sections/announcements_page.dart';
import 'sections/digital_id_page.dart';
import 'sections/news_page.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _currentIndex = 0;

  Future<void> _refreshCurrent() async {
    switch (_currentIndex) {
      case 0:
        ref.invalidate(newsFutureProvider);
        await ref.read(newsFutureProvider.future);
        break;
      case 1:
        ref.invalidate(announcementsFutureProvider);
        await ref.read(announcementsFutureProvider.future);
        break;
      case 2:
        await ref.read(authControllerProvider.notifier).refreshMember();
        break;
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Oturumu kapat'),
        content: const Text(
          'Uygulamadan çıkış yapmak istediğinize emin misiniz?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Vazgeç'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Çıkış Yap'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final member = authState.member;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Sendika Üye Portalı'),
            if (member != null)
              Text(
                member.fullName,
                style: Theme.of(context).textTheme.labelMedium,
              ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _refreshCurrent,
            icon: const Icon(Icons.refresh),
            tooltip: 'Yenile',
          ),
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Çıkış yap',
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: const [NewsPage(), AnnouncementsPage(), DigitalIdPage()],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        height: 72,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.article_outlined),
            selectedIcon: Icon(Icons.article),
            label: 'Haberler',
          ),
          NavigationDestination(
            icon: Icon(Icons.campaign_outlined),
            selectedIcon: Icon(Icons.campaign),
            label: 'Duyurular',
          ),
          NavigationDestination(
            icon: Icon(Icons.qr_code_2_outlined),
            selectedIcon: Icon(Icons.qr_code_2),
            label: 'Dijital Kimlik',
          ),
        ],
      ),
    );
  }
}
