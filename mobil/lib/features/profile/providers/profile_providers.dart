import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/branch_repository.dart';
import '../domain/branch.dart';

final branchRepositoryProvider = Provider<BranchRepository>((ref) {
  return BranchRepository(ref.watch(supabaseClientProvider));
});

final branchByCityProvider = FutureProvider.autoDispose.family<Branch?, String>(
  (ref, city) {
    return ref.watch(branchRepositoryProvider).fetchByCity(city);
  },
);
