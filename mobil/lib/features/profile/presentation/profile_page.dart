import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../auth/application/auth_controller.dart';
import '../../auth/domain/member.dart';
import '../domain/branch.dart';
import '../providers/profile_providers.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  bool _notificationsEnabled = true;
  bool _emailUpdatesEnabled = true;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final member = authState.member;
    final theme = Theme.of(context);

    if (member == null) {
      return Center(
        child: Text(
          'Profil bilgileri yüklenemedi.',
          style: theme.textTheme.bodyMedium,
        ),
      );
    }

    final branchAsync = member.city != null
        ? ref.watch(branchByCityProvider(member.city!))
        : const AsyncValue<Branch?>.data(null);

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      children: [
        _ProfileHeader(member: member),
        const SizedBox(height: 16),
        _MembershipInfoCard(member: member),
        const SizedBox(height: 16),
        _BranchInfoCard(branchAsync: branchAsync),
        const SizedBox(height: 16),
        _SettingsSupportCard(
          notificationsEnabled: _notificationsEnabled,
          emailUpdatesEnabled: _emailUpdatesEnabled,
          onNotificationsChanged: (value) {
            setState(() {
              _notificationsEnabled = value;
            });
          },
          onEmailUpdatesChanged: (value) {
            setState(() {
              _emailUpdatesEnabled = value;
            });
          },
          member: member,
        ),
      ],
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.member});

  final Member member;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final initials = member.firstName.isNotEmpty ? member.firstName[0] : 'U';

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor:
                  theme.colorScheme.primary.withValues(alpha: 0.2),
              child: Text(
                initials,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    member.fullName,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _StatusChip(label: member.statusLabel),
                      const SizedBox(width: 8),
                      Text(
                        member.membershipNumber,
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
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

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _MembershipInfoCard extends StatelessWidget {
  const _MembershipInfoCard({required this.member});

  final Member member;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final updatedAt = member.updatedAt != null
        ? DateFormat('d MMMM y, HH:mm', 'tr_TR')
            .format(member.updatedAt!.toLocal())
        : null;

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Üyelik Bilgileri',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            _InfoRow(label: 'Üye No', value: member.membershipNumber),
            _InfoRow(label: 'T.C. Kimlik', value: member.maskedTc),
            _InfoRow(label: 'Durum', value: member.statusLabel),
            if (member.phone != null)
              _InfoRow(label: 'Telefon', value: member.phone!),
            if (member.email != null)
              _InfoRow(label: 'E-posta', value: member.email!),
            if (member.city != null)
              _InfoRow(
                label: 'İl/İlçe',
                value:
                    '${member.city ?? ''}${member.district != null ? ' / ${member.district}' : ''}',
              ),
            if (member.workplace != null)
              _InfoRow(label: 'Kurum', value: member.workplace!),
            if (member.position != null)
              _InfoRow(label: 'Görev', value: member.position!),
            if (updatedAt != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Son güncelleme: $updatedAt',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _BranchInfoCard extends StatelessWidget {
  const _BranchInfoCard({required this.branchAsync});

  final AsyncValue<Branch?> branchAsync;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'İletişim ve Şube',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            branchAsync.when(
              data: (branch) {
                if (branch == null) {
                  return Text(
                    'Şube bilgisi bulunamadı. Destek için genel merkez ile iletişime geçebilirsiniz.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.white.withValues(alpha: 0.7),
                    ),
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _InfoRow(label: 'Şube', value: branch.branchName),
                    _InfoRow(
                      label: 'Şube Başkanı',
                      value: branch.presidentName,
                    ),
                    if (branch.presidentPhone != null)
                      _ActionRow(
                        icon: Icons.call_outlined,
                        label: branch.presidentPhone!,
                        onTap: () => _launchPhone(
                          context,
                          branch.presidentPhone!,
                        ),
                      ),
                    if (branch.presidentEmail != null)
                      _ActionRow(
                        icon: Icons.email_outlined,
                        label: branch.presidentEmail!,
                        onTap: () => _launchEmail(
                          context,
                          branch.presidentEmail!,
                        ),
                      ),
                    if (branch.address != null)
                      _InfoRow(label: 'Adres', value: branch.address!),
                  ],
                );
              },
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: LinearProgressIndicator(),
              ),
              error: (error, _) => Text(
                'Şube bilgileri yüklenemedi.\n${error.toString()}',
                style: theme.textTheme.bodyMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchPhone(BuildContext context, String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    final success = await launchUrl(uri);
    if (!success && context.mounted) {
      _showSnack(context, 'Arama başlatılamadı.');
    }
  }

  Future<void> _launchEmail(BuildContext context, String email) async {
    final uri = Uri(
      scheme: 'mailto',
      path: email,
      queryParameters: {'subject': 'Sendika İletişim'},
    );
    final success = await launchUrl(uri);
    if (!success && context.mounted) {
      _showSnack(context, 'E-posta uygulaması açılamadı.');
    }
  }

  void _showSnack(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}

class _SettingsSupportCard extends StatelessWidget {
  const _SettingsSupportCard({
    required this.notificationsEnabled,
    required this.emailUpdatesEnabled,
    required this.onNotificationsChanged,
    required this.onEmailUpdatesChanged,
    required this.member,
  });

  final bool notificationsEnabled;
  final bool emailUpdatesEnabled;
  final ValueChanged<bool> onNotificationsChanged;
  final ValueChanged<bool> onEmailUpdatesChanged;
  final Member member;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Text(
                  'Ayarlar ve Destek',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          SwitchListTile(
            value: notificationsEnabled,
            onChanged: onNotificationsChanged,
            title: const Text('Bildirimleri al'),
            subtitle: const Text('Duyuru ve haber bildirimleri'),
          ),
          SwitchListTile(
            value: emailUpdatesEnabled,
            onChanged: onEmailUpdatesChanged,
            title: const Text('E-posta güncellemeleri'),
            subtitle: const Text('Etkinlik ve duyuru özetleri'),
          ),
          ListTile(
            leading: const Icon(Icons.support_agent_outlined),
            title: const Text('Yardım ve Destek'),
            subtitle: const Text('Sorularınız için destek kanalları'),
            onTap: () => _showSupportSheet(context),
          ),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('Uygulama hakkında'),
            subtitle: const Text('Sürüm ve gizlilik bilgileri'),
            onTap: () => _showAbout(context),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  void _showSupportSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: Theme.of(context).cardColor,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Destek',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Size yardımcı olmak için buradayız. Şube veya genel merkez ile iletişime geçebilirsiniz.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.phone_outlined),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      member.phone ?? 'Şube telefonunu profil bölümünde görebilirsiniz.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Tamam'),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showAbout(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Uygulama Hakkında'),
        content: const Text(
          'Ulaştırma Kamu Çalışanları Sendikası mobil uygulaması. '
          'Haberler, duyurular, etkinlikler ve dijital kimlik kartı tek yerde.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Kapat'),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: theme.textTheme.labelMedium?.copyWith(
                color: Colors.white.withValues(alpha: 0.65),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.white.withValues(alpha: 0.85),
              ),
            ),
          ),
          TextButton(
            onPressed: onTap,
            child: const Text('Aç'),
          ),
        ],
      ),
    );
  }
}
