import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../widgets/member_qr_card.dart';
import '../../../auth/application/auth_controller.dart';
import '../../../auth/domain/member.dart';

class DigitalIdPage extends ConsumerWidget {
  const DigitalIdPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final member = authState.member;

    if (member == null) {
      return const Center(
        child: Text('Üye bilgileri bulunamadı. Lütfen yeniden giriş yapın.'),
      );
    }

    final theme = Theme.of(context);
    final canCopyMembership = member.membershipNumber.isNotEmpty;
    final lastUpdated = member.updatedAt != null
        ? DateFormat('d MMMM y, HH:mm', 'tr_TR')
            .format(member.updatedAt!.toLocal())
        : 'Belirtilmemiş';

    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 32),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: _IdentityHeader(
            member: member,
            lastUpdatedLabel: lastUpdated,
          ),
        ),
        const SizedBox(height: 32),
        MemberQrCard(member: member),
        const SizedBox(height: 20),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () =>
                      ref.read(authControllerProvider.notifier).refreshMember(),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Bilgileri Güncelle'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: canCopyMembership
                      ? () {
                          Clipboard.setData(
                            ClipboardData(text: member.membershipNumber),
                          );
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Üyelik numarası kopyalandı: ${member.membershipNumber}',
                              ),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      : null,
                  icon: const Icon(Icons.copy_outlined),
                  label: const Text('Üyelik No'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: _InfoGrid(member: member),
        ),
        const SizedBox(height: 28),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: _SecurityTipsCard(),
        ),
        const SizedBox(height: 36),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Text(
            'Destek için sendika şubenizle iletişime geçebilirsiniz.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              color: Colors.white.withValues(alpha: 0.55),
            ),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _IdentityHeader extends StatelessWidget {
  const _IdentityHeader({
    required this.member,
    required this.lastUpdatedLabel,
  });

  final Member member;
  final String lastUpdatedLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;

    final locationParts = [
      if (member.city != null && member.city!.isNotEmpty) member.city!,
      if (member.district != null && member.district!.isNotEmpty)
        member.district!,
    ];
    final locationLabel = locationParts.join(' • ');

    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(32),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            accent.withValues(alpha: 0.9),
            accent.withValues(alpha: 0.65),
            theme.colorScheme.secondary.withValues(alpha: 0.55),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: 0.35),
            blurRadius: 32,
            offset: const Offset(0, 22),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Chip(
                avatar: const Icon(Icons.verified, size: 18, color: Colors.white),
                label: Text(
                  member.statusLabel,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                backgroundColor: Colors.white.withValues(alpha: 0.18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              ),
              if (member.membershipNumber.isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.badge, size: 18, color: Colors.white),
                      const SizedBox(width: 8),
                      Text(
                        member.membershipNumber,
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            member.fullName,
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              _HeaderChip(
                icon: Icons.badge_outlined,
                label: member.maskedTc,
              ),
              if (locationLabel.isNotEmpty)
                _HeaderChip(
                  icon: Icons.location_city_outlined,
                  label: locationLabel,
                ),
              if (member.phone != null && member.phone!.isNotEmpty)
                _HeaderChip(
                  icon: Icons.phone_outlined,
                  label: member.phone!,
                ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            'Son güncelleme: $lastUpdatedLabel',
            style: theme.textTheme.bodySmall?.copyWith(
              color: Colors.white.withValues(alpha: 0.75),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderChip extends StatelessWidget {
  const _HeaderChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Colors.white),
          const SizedBox(width: 8),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoGrid extends StatelessWidget {
  const _InfoGrid({required this.member});

  final Member member;

  @override
  Widget build(BuildContext context) {
    final items = <_InfoData>[
      _InfoData('TC Kimlik', member.maskedTc, Icons.badge_outlined),
      _InfoData(
        'Telefon',
        member.phone?.isNotEmpty == true ? member.phone! : 'Belirtilmemiş',
        Icons.phone_iphone_outlined,
      ),
      _InfoData(
        'E-posta',
        member.email?.isNotEmpty == true ? member.email! : 'Belirtilmemiş',
        Icons.mail_outline,
      ),
      _InfoData(
        'Şehir',
        member.city?.isNotEmpty == true ? member.city! : 'Belirtilmemiş',
        Icons.location_on_outlined,
      ),
      _InfoData(
        'İlçe',
        member.district?.isNotEmpty == true ? member.district! : 'Belirtilmemiş',
        Icons.map_outlined,
      ),
      _InfoData(
        'Çalıştığı Kurum',
        member.workplace?.isNotEmpty == true
            ? member.workplace!
            : 'Belirtilmemiş',
        Icons.apartment_outlined,
      ),
      _InfoData(
        'Görev',
        member.position?.isNotEmpty == true ? member.position! : 'Belirtilmemiş',
        Icons.work_outline,
      ),
      _InfoData(
        'Üyelik Durumu',
        member.statusLabel,
        Icons.verified_user_outlined,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 520;
        final tileWidth =
            isWide ? (constraints.maxWidth - 16) / 2 : constraints.maxWidth;

        return Wrap(
          spacing: 16,
          runSpacing: 16,
          children: items
              .map(
                (item) => SizedBox(
                  width: isWide ? tileWidth : double.infinity,
                  child: _InfoTile(data: item),
                ),
              )
              .toList(),
        );
      },
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.data});

  final _InfoData data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: theme.cardColor,
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 18,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: accent.withValues(alpha: 0.16),
            child: Icon(data.icon, color: accent),
          ),
          const SizedBox(height: 14),
          Text(
            data.label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.65),
              letterSpacing: 0.2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            data.value,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoData {
  const _InfoData(this.label, this.value, this.icon);

  final String label;
  final String value;
  final IconData icon;
}

class _SecurityTipsCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;
    final tips = <String>[
      'QR kodu yalnızca yetkili sendika görevlileri ile paylaşın.',
      'Cihazınızı başkası kullanacaksa uygulamadan çıkış yapmayı unutmayın.',
      'Bilgilerinizde şüpheli bir durum fark ederseniz sendika ile iletişime geçin.',
    ];

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        color: theme.cardColor,
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 22,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: accent.withValues(alpha: 0.18),
                child: Icon(Icons.shield_outlined, color: accent),
              ),
              const SizedBox(width: 12),
              Text(
                'Güvenlik Önerileri',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...tips.map(
            (tip) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    size: 18,
                    color: accent.withValues(alpha: 0.9),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      tip,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.72),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
