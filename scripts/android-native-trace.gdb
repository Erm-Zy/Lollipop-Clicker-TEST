# Diagnostic-only: function names/PCs, never arguments, locals or memory dumps.
set pagination off
set confirm off
set debuginfod enabled off
set print frame-arguments none
handle SIGPIPE nostop noprint pass
handle SIGUSR1 nostop noprint pass
handle SIGUSR2 nostop noprint pass
python
import datetime
import gdb
def native_stop(event):
    if isinstance(event, gdb.SignalEvent) and event.stop_signal in ('SIGSEGV', 'SIGABRT'):
        print('SMOKE_NATIVE_SIGNAL utc=' + datetime.datetime.now(datetime.timezone.utc).isoformat() + ' signal=' + event.stop_signal)
        gdb.execute('bt 20')
        gdb.execute('info symbol $pc')
        print('SMOKE_NATIVE_TRACE_END')
gdb.events.stop.connect(native_stop)
gdb.execute('run')
# QEMU/JIT may handle a signal intentionally. Resume with its original delivery,
# observing every stop until the inferior actually exits. Only an unhandled
# terminal signal plus the final stack establishes a native crash.
while gdb.selected_inferior().pid:
    gdb.execute('continue')
end
