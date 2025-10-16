# adapté de cf https://brython.info/tests/editor.py
# utilisé pour que l'exécution de code python s'affiche en console, avec gestion des erreurs
# il faut appeler setOutput(id) pour avoir la sortie python sur la page

import re
import sys
import binascii
import tb as traceback
import javascript

from browser import console, document, html, window
from mathgraph import setToScope

# retourne un élément ou un objet global
def getById(id):
    if id not in window:
        raise Exception('No ' + id + ' in current document')
    return window[id]

class cOutput:
    def __init__(self, id):
        self.console = getById(id)
        self.buf = ''

    def write(self, data):
        self.buf += str(data)
        if ('\n' in self.buf):
            # on flush tout
            self.console.innerText += self.buf
            self.buf = ''

    def flush(self):
        self.console.innerText += self.buf
        self.buf = ''

    def __len__(self):
        return len(self.buf)

# affecte la sortie python à un id du dom
def setOutput(id):
    cOut = cOutput(id)
    sys.stdout = cOut
    sys.stderr = cOut

def suggestion(exc):
    message = ''
    if isinstance(exc, AttributeError):
        suggestion = __BRYTHON__.offer_suggestions_for_attribute_error(exc)
        if suggestion is not None:
            message += f". Did you mean: '{suggestion}'?"
    elif isinstance(exc, NameError):
        suggestion = __BRYTHON__.offer_suggestions_for_name_error(exc)
        if suggestion is not None:
            message += f". Did you mean: '{suggestion}'?"
        elif exc.name in __BRYTHON__.stdlib_module_names:
            message += f". Did you forget to import '{exc.name}'?"
    return message

def trace_exc(run_frame, src, ns):
    result_lines = []
    exc_type, exc_value, traceback = sys.exc_info()

    if __BRYTHON__.debug > 1:
        console.log(exc_value)

    def handle_repeats(filename, lineno, count_repeats):
        if count_repeats > 1:
            for _ in range(2):
                result_lines.append(f'  File {filename}, line {lineno}')
                show_line(filename, lineno, src)
            result_lines.append(f'[Previous line repeated {count_repeats - 2}' +
                ' more times]')

    def show_line(filename, lineno, src):
        if filename == ns['__file__']:
            source = src
        elif filename.startswith('<'):
            return '-- from ' + filename
        else:
            src = open(filename, encoding='utf-8').read()
        lines = src.split('\n')
        line = lines[lineno - 1]
        result_lines.append('    ' + line.strip())
        return line

    started = False
    save_filename = None
    save_lineno = None
    same_line = False
    count_repeats = 0

    while traceback:
        frame = traceback.tb_frame
        # don't show the frames above that of the "run" function
        if frame is run_frame:
            started = True
            result_lines.append('Traceback (most recent call last):')
        elif started:
            lineno = frame.f_lineno
            filename = frame.f_code.co_filename
            if filename == save_filename and lineno == save_lineno:
                count_repeats += 1
                traceback = traceback.tb_next
                continue
            handle_repeats(save_filename, save_lineno, count_repeats)
            count_repeats = 0
            save_filename = filename
            save_lineno = lineno
            name = frame.f_code.co_name
            result_lines.append(f'  File {filename}, line {lineno}, in {name}')
            show_line(filename, lineno, src)
        traceback = traceback.tb_next

    handle_repeats(save_filename, save_lineno, count_repeats)

    if isinstance(exc_value, SyntaxError):
        filename = exc_value.args[1][0]
        lineno = exc_value.args[1][1]
        result_lines.append(f'  File {filename}, line {lineno}')
        line = exc_value.text
        if line:
            result_lines.append('    ' + line.strip())
            indent = len(line) - len(line.lstrip())
            col_offset = exc_value.args[1][2]
            result_lines.append('    ' +  (col_offset - indent - 1) * ' ' + '^')

    message = str(exc_value) + suggestion(exc_value)
    result_lines.append(f'{exc_type.__name__}: {message}')
    return '\n'.join(result_lines)

def cleanTrace(match):
    # @todo gérer le multilinguisme
    if match.group(1) is not None:
        return "Error in your script line " + match.group(1)

def runCode(appId, code):
    try:
        msg = ''
        ns = {'__name__':'__main__', '__file__': 'runner'}
        app = getById(appId)
        setToScope(app, ns)
        exec(code, ns)
    except Exception as exc:
        trace = trace_exc(sys._getframe(), code, ns)
        cleanedTrace = re.sub(r"File <string>, line (\d+), in <module>", cleanTrace, trace)
        print(cleanedTrace)

def runAce(appId, editorName):
    aceEditor = getById(editorName)
    code = aceEditor.getValue()
    return runCode(appId, code)

def runById(appId, scriptId):
    scriptElt = getById(scriptId)
    code = scriptElt.textContent
    return runCode(appId, code)
